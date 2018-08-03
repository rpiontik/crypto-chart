import CandlesWorker from 'worker-loader!../workers/CandlesWorker.js';

export default {
  methods: {
    _remakeCandles () {
      this.workers.candlesWorker.postMessage({
        task: 'RENDER',
        offset: this.interval.offset,
        exposition: this.exposition,
        viewWidth: this.chart.width,
        viewHeight: this.chart.height
      });
    },
    _onCandlesWorkerMessage (message) {
      switch (message.data.type) {
        case 'APPENDED' : {
          this._remakeCandles();
          break;
        }
        case 'RENDERED' : {
          let candles = {};
          for (let field in message.data.body) {
            if (field !== 'candles') {
              candles[field] = message.data.body[field];
            }
          }
          this.candles = candles;
          this.candles['candles'] = message.data.body.candles;
          break;
        }
        default: break;
      }
    }
  },
  data () {
    let candlesWorker = new CandlesWorker({
      candleWidths: this.availableCandleWidths
    });
    candlesWorker.onmessage = this._onCandlesWorkerMessage;
    candlesWorker.postMessage({
      task: 'SET-PARAMS',
      params: {
        candleWidths: this.availableCandleWidths
      }
    });
    candlesWorker.postMessage({task: 'APPEND', data: this.data});
    candlesWorker.redraw = this._remakeCandles;
    return {
      workers: {
        candlesWorker
      }
    }
  }
};
