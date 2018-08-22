export default {
  props: {
    initialSize: {
      type: Object,
      required: false
    },
    data: {
      type: Array,
      required: true
    },
    dataAverage: {
      type: Array,
      required: true
    },
    noMoreData: {
      type: Boolean,
      required: true
    },
    intervalWidth: {
      type: Number,
      required: false,
      default: 86400
    },
    initExposition: {
      type: Number,
      required: false,
      default: 86400
    },
    intervalStartOffset: {
      type: Number,
      required: false,
      default: null
    },
    availableCandleWidths: {
      type: Array,
      required: false,
      default: () => [900, 1800, 3600, 14400, 28800, 43200, 86400, 604800, 2592000, 31536000]
    },
    availableIntervals: {
      type: Array,
      required: false,
      default: () => [900, 1800, 3600, 14400, 28800, 43200, 86400, 604800, 2592000, 31536000]
    }
  },
  watch: {
    intervalWidth (value) {
      this.interval.width = value;
    },
    initExposition (value) {
      this.zoom.value = this.interval.width / value;
    },
    intervalStartOffset (value) {
      this.interval.offset = value;
    },
    availableCandleWidths (value) {
      this.candleWidths = value;
      this.workers.candlesWorker.postMessage({
        task: 'SET-PARAMS',
        params: {
          candleWidths: this.availableCandleWidths
        }
      });
      this.zoom.value = this.rebaseZoom(this.zoom.value);
      if ('onRedraw' in this) {
        this.onRedraw();
      }
    },
    availableIntervals (value) {
      this.zoom.time_parts = value;
      this.zoom.value = this.rebaseZoom(this.zoom.value);
      if ('onRedraw' in this) {
        this.onRedraw();
      }
    },
    data (value) {
      this.chartData = value;
      return {}
    },
  }
};
