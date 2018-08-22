const MIN_WIDTH_CANDLE = 10; // Минимальная ширина свечи
const VOLUME_ZONE = 0.3;    // Область отводимая на объем

class CandlesWorker {
  constructor () {
    this.data = {
      treeReady: false,
      raw: [],
      start: null,
      width: null,
      tree: [],
    };
    this.averageData = [];
    this.params = {
      empty: false,
      noMoreData: false,
      dataRequestPending: false,
      candleWidths: []
    }
  }
  /**
   * @description Send message to parrent
   * @param {String} type - string based command for parrent
   * @param {Object} body - data for message depends on command
   */
  sendMessage (type, body = null) {
    postMessage({type, body});
  }
  messageHandler (message) {
    switch (message.data.task) {
      case 'SET-PARAMS': {
        this.setParams(message.data.params);
        break;
      }
      case 'APPEND': {
        this.append(message.data.data);
        break;
      }
      case 'APPEND_AVERAGE': {
        this.appendAverage(message.data.data);
        break;
      }
      case 'RENDER': {
        this.renderAverage(message.data.offset, message.data.exposition, message.data.viewWidth, message.data.viewHeight)
        this.renderCandles(message.data.offset, message.data.exposition, message.data.viewWidth, message.data.viewHeight);
        break;
      }
      default: break;
    }
  }
  resetData () {
    this.data.treeReady = false;
    this.data.raw = [];
    this.data.start = null;
    this.data.width = null;
    this.data.tree = [];
  }
  /**
   * @description Apply params for render
   * @param {Object} params - params
   * @return none
   */
  setParams (freshParams) {
    Object.keys(freshParams).map((param) => {
      this.params[param] = freshParams[param];
    });
    this.data.treeReady = false;
  }
  /**
   * @description Append part the chart data
   * @param {Number} chartID - chart ID
   * @param {Array} data - data of candles
   * @return none
   */
  append (data) {
    console.log('APPEND');
    this.params.dataRequestPending = false;
    if (data.length > 0) {
      this.data.treeReady = false;
      this.data.raw.splice(0);
      this.data.raw = data.slice();
      this.data.raw.sort((a, b) => { return a.date - b.date;});
    } else if (!this.params.empty && !this.params.noMoreData) {
      this.resetData();
    }
    this.sendMessage('APPENDED');
  }
  appendAverage (data) {
    console.log('APPEND AVERAGE', data);
    this.averageData.splice(0);
    this.averageData = data.slice();
    // this.params.dataRequestPending = false;
    // if (data.length > 0) {
    //   this.data.treeReady = false;
    //   this.data.raw.splice(0);
    //   this.data.raw = data.slice();
    //   this.data.raw.sort((a, b) => { return a.date - b.date;});
    // } else if (!this.params.empty && !this.params.noMoreData) {
    //   this.resetData();
    // }
    this.sendMessage('APPENDED');
  }
  /**
   * @description Make specific tree by raw data
   * @return none
   */
  makeTree () {
    if (this.data.raw.length > 0) {
      this.data.start = this.data.raw[0].date;
      this.data.end = this.data.raw[this.data.raw.length - 1].date;
      this.params.candleWidths.map((case_) => {
        this.data.tree[case_] = [];

        let lastCandle = null;

        this.data.raw.map((candle) => {
          let id = candle.date - (candle.date % case_);
          if (lastCandle && (id === lastCandle.id)) {
            lastCandle.low = candle.low < lastCandle.low ? candle.low : lastCandle.low;
            lastCandle.high = candle.high > lastCandle.high ? candle.high : lastCandle.high;
            lastCandle.close = candle.close;
            lastCandle.volume += candle.volume;
          } else {
            if (lastCandle) {
              this.data.tree[case_].push(lastCandle);
            }
            lastCandle = {
              id: id,
              timestamp: candle.date,
              open: candle.open,
              low: candle.low,
              high: candle.high,
              close: candle.close,
              volume: candle.volume
            };
          }
        });
        if (lastCandle) {
          this.data.tree[case_].push(lastCandle);
        }
      });
      console.log(this.data.tree);
      this.data.treeReady = true;
    }
  }
  /**
   * @description Looking for satisfying width of candle
   * @param {Number} exposition - exposition width
   * @param {Number} viewWidth  - view box width
   * @return true/false
   */
  findCandleWidthForUse (exposition, viewWidth) {
    let targetCandleNumber = viewWidth / MIN_WIDTH_CANDLE;
    let caseCandidate = null;
    let prevCandleDiff = 0;
    this.params.candleWidths.map((case_) => {
      if (caseCandidate) {
        let candleDiff = Math.abs(Math.round(targetCandleNumber - exposition / case_));
        if (candleDiff < prevCandleDiff) {
          prevCandleDiff = candleDiff;
          caseCandidate = case_;
        }
      } else {
        caseCandidate = case_;
        prevCandleDiff = Math.abs(Math.round(targetCandleNumber - exposition / case_));
      }
    });
    return caseCandidate;
  }
  /**
   * @description Render candles objects
   * @param {Number} offset     - exposition offset
   * @param {Number} exposition - exposition width
   * @param {Number} viewWidth  - view box width
   * @return true/false
   */
  renderCandles (offset, exposition, viewWidth, viewHeight) {
    if (!this.data.treeReady) {
      this.makeTree();
    }
    console.log('RENDER', this.data.start > 0, this.data.start, offset);
    if (this.data.start > 0 && this.data.start < offset) {
      let theCase = this.findCandleWidthForUse(exposition, viewWidth);
      let theData = this.data.tree[theCase];
      let koofX = viewWidth / exposition;
      let result = {
        low: null,
        high: null,
        maxVolume: null,
        width: theCase * koofX,
        candles: [],
        candlesPositivePath: [],
        candlesNegativePath: [],
        volumePath: []
      };
      let start = 0;
      let stop = theData.length;

      if (offset > this.data.start) {
        start = -Math.floor((offset - this.data.start) / theCase);
      }

      for (let index = -start; index < stop; index++) {
        let candle = theData[index];
        if (candle.timestamp <= offset) {
          continue;
        } else if (candle.timestamp > offset + exposition) {
          stop = index;
          break;
        } else if (start < 0) {
          start = index;
        }
        if ((result.low == null) || (result.low > candle.low)) {
          result.low = candle.low;
        }
        if ((result.high == null) || (result.high < candle.high)) {
          result.high = candle.high;
        }
        if ((result.maxVolume == null) || (result.maxVolume < candle.volume)) {
          result.maxVolume = candle.volume;
        }
      }

      start = Math.abs(start);
      if (stop == null) {
        stop = theData.length;
      }
      let koofY = viewHeight / (result.high - result.low);
      let koofYV = viewHeight * VOLUME_ZONE / result.maxVolume; // for volume
      let barHalf = theCase * koofX * 0.25;
      for (let index = start; index < stop; index++) {
        let candle = theData[index];
        let x = (candle.timestamp - offset) * koofX;
        let pathMainLine = `M${x} ${(result.high - candle.low) * koofY} L${x} ${(result.high - candle.high) * koofY} `;
        let pathCandleBody = `M${x - barHalf} ${(result.high - candle.close) * koofY} L${x + barHalf} ${(result.high - candle.close) * koofY} ` +
            `L${x + barHalf} ${(result.high - candle.open) * koofY} L${x - barHalf} ${(result.high - candle.open) * koofY} `;
        let rCandle = Object.assign({}, candle);

        if (candle.open <= candle.close) {
          rCandle.class = 'positive';
          rCandle.candlePathIndex = result.candlesPositivePath.push(pathMainLine + pathCandleBody) - 1;
        } else {
          rCandle.class = 'negative';
          rCandle.candlePathIndex = result.candlesNegativePath.push(pathMainLine + pathCandleBody) - 1;
        }

        rCandle.volumePathIndex = result.volumePath.push(`M${x - barHalf} ${viewHeight - candle.volume * koofYV} L${x + barHalf} ${viewHeight - candle.volume * koofYV} ` +
          `L${x + barHalf} ${viewHeight} L${x - barHalf} ${viewHeight} `) - 1;

        rCandle.x = x;
        result.candles.push(rCandle);
      }
      this.sendMessage('RENDERED', result);
    } else if (!this.params.dataRequestPending) {
      this.params.dataRequestPending = true;
      this.sendMessage('NEED_DATA', {offset, exposition});
    }
  }
  renderAverage (offset, exposition, viewWidth, viewHeight) {
    let dataLength = this.averageData.length;
    let step = viewWidth / this.averageData.length;
    let result = {
      minTimestamp: this.averageData[0].date,
      maxTimestamp: this.averageData[dataLength - 1].date,
      path: []
    };
    let sortedByAverage = this.averageData.slice().sort((a, b) => {return a.average - b.average;});
    let highest = sortedByAverage[dataLength - 1].average;
    let lowest = sortedByAverage[0].average;
    let yMultiplyer = 44 / (highest - lowest);
    for (let i = 0; i < dataLength; i++) {
      if (i === 0) {
        result.path.push(`M${step * i} ${yMultiplyer * (highest - this.averageData[i].average) + 3}`);
      } else {
        result.path.push(`L${step * i} ${yMultiplyer * (highest - this.averageData[i].average) + 3}`);
      }
    }
    this.sendMessage('RENDERED_AVERAGE', result);
  }
}

let worker = new CandlesWorker();

onmessage = (data) => {
  worker.messageHandler(data);
};
