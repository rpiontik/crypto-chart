const MIN_WIDTH_CANDLE = 3; // Минимальная ширина свечи
const VOLUME_ZONE = 0.3;    // Область отводимая на объем

class ChartWorker {
  constructor () {
    this.data = {
      params: {},
      treeReady: false,
      raw: [],
      start: null,
      width: null,
      tree: [],
    };
  }

  /**
   * @description Apply params for render
   * @param {Object} params - params
   * @return none
   */
  setParams (params) {
    this.data.params = params;
    this.data.treeReady = false;
  }

  /**
   * @description Append part the chart data
   * @param {Number} chartID - chart ID
   * @param {Array} data - data of candles
   * @return none
   */
  append (data) {
    this.data.treeReady = false;
    this.data.raw = this.data.raw.concat(data);
    this.data.raw.sort((a, b) => {
      if (a.timestamp < b.timestamp) {
        return -1;
      } else if (a.timestamp > b.timestamp) {
        return 1;
      }
      return 0;
    });
    this.sendMessage('APPENDED');
  }

  /**
   * @description Make specific tree by raw data
   * @return none
   */
  makeTree () {
    this.data.start = this.data.raw[0].timestamp;
    this.data.end = this.data.raw[this.data.raw.length - 1].timestamp;
    this.data.params.candleWidths.map((case_) => {
      this.data.tree[case_] = [];

      let lastCandle = null;

      this.data.raw.map((candle) => {
        let id = candle.timestamp - (candle.timestamp % case_);
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
            timestamp: candle.timestamp,
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
    this.data.treeReady = true;
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
    this.data.params.candleWidths.map((case_) => {
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
  render (offset, exposition, viewWidth, viewHeight) {
    if (!this.data.treeReady) {
      this.makeTree();
    }

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
      let path = `M${x + barHalf} ${(candle.low - result.low) * koofY} L${x + barHalf} ${(candle.high - result.low) * koofY} `;
      let rCandle = Object.assign({}, candle);

      if (candle.open > candle.close) {
        rCandle.class = 'positive';
        rCandle.candlePathIndex = result.candlesPositivePath.push(
          path + `M${x} ${(candle.close - result.low) * koofY} L${x + barHalf * 2} ${(candle.close - result.low) * koofY} ` +
            `L${x + barHalf * 2} ${(candle.open - result.low) * koofY} L${x} ${(candle.open - result.low) * koofY} `
        ) - 1;
      } else {
        rCandle.class = 'negative';
        rCandle.candlePathIndex = result.candlesNegativePath.push(
          path + `M${x} ${(candle.open - result.low) * koofY} L${x + barHalf * 2} ${(candle.open - result.low) * koofY} ` +
            `L${x + barHalf * 2} ${(candle.close - result.low) * koofY} L${x} ${(candle.close - result.low) * koofY} `
        ) - 1;
      }

      rCandle.volumePathIndex = result.volumePath.push(`M${x} ${viewHeight - candle.volume * koofYV} L${x + barHalf * 2} ${viewHeight - candle.volume * koofYV} ` +
        `L${x + barHalf * 2} ${viewHeight} L${x} ${viewHeight} `) - 1;

      rCandle.x = x;
      result.candles.push(rCandle);
    }
    this.sendMessage('RENDERED', result);
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
      case 'RENDER': {
        this.render(
          message.data.offset,
          message.data.exposition,
          message.data.viewWidth,
          message.data.viewHeight
        );
        break;
      }
      default: break;
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
}

let worker = new ChartWorker();

onmessage = (data) => {
  worker.messageHandler(data);
};
