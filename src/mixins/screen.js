export default {
  data() {
    return {
      height: null,
      width: null,
      clientWidth: null,
      clientHeight: null,
      chart: {
        height: 260,
        width: 940,
        offset: {
          top: 0,
          left: 0
        }
      },
      zoom: {
        value: this.intervalWidth / this.initExposition,
        time_parts: this.availableIntervals,
        curr_time_part: 0
      },
      interval: {
        width: this.intervalWidth,
        offset: this.intervalStartOffset ? +this.intervalStartOffset : 0
      }
    }
  },
  created () {
    window.addEventListener('resize', this._onResize);
  },
  destroyed () {
    window.removeEventListener('resize', this._onResize);
  },
  mounted () {
    this._onResize();
  },
  watch: {
    'zoom.value' () {
      this.onRedraw();
    },
    'interval.offset' () {
      this.onRedraw();
    }
  },
  methods: {
    _calcKoofScreenY() {
      return ('clientHeight' in this) && (+this.clientHeight) !== 0 ? this.height / this.clientHeight : 1;
    },
    _onResize () {
      if (this.initialSize.width > 0) {
        this.width = this.initialSize.width;
      } else {
        this.clientWidth = this.$el.clientWidth;
        this.width = this.clientWidth;
      }
      if (this.initialSize.height > 0) {
        this.height = this.initialSize.height;
      } else {
        this.clientHeight = this.$el.clientHeight;
        this.height = this.clientHeight;
      }
      this.chart.width = this.width - this.chart.offset.left - this.koofScreenX * 2;
      this.chart.height = this.height - this.chart.offset.top - this.fontSizeAxisX * 1.5;
      if ('onRedraw' in this) {
        this.onRedraw();
      }
    },
    _rebaseZoomByParams (params, zoom) {
      let maxPart = params.zoom.time_parts[params.zoom.time_parts.length - 1];
      let minPart = params.zoom.time_parts[0];
      let minZoom = params.interval.width / (maxPart * params.zoom.time_parts.length);
      let maxZoom = params.interval.width / (minPart * 3);
      let result = zoom < minZoom ? minZoom : zoom;

      if (this.candleWidths && this.candleWidths.length) {
        let maxCandleWidth = this.candleWidths[this.candleWidths.length - 1];
        minZoom = params.interval.width / (maxCandleWidth * this.chart.width / 3);
        result = result < minZoom ? minZoom : result;
      }
      return result > maxZoom ? maxZoom : result;
    },
    rebaseZoom (zoom) {
      return this._rebaseZoomByParams(this, zoom);
    },
    onZoom (zoom, targetMoment) {
      let oldExposition = this.exposition;
      let zoomValue = this.rebaseZoom(this.zoom.value * zoom);
      this.zoom.value = zoomValue < 1 ? 1 :this.rebaseZoom(this.zoom.value * zoom);
      this.interval.offset = this._rebaseOffset(
        this.interval.offset + (oldExposition - this.exposition) *
        ((targetMoment - this.interval.offset) / this.exposition)
      );
    },
    _rebaseOffset (offset) {
      if (offset < 0) {
        offset = 0;
      } else if (offset > this.interval.width - this.exposition) {
        offset = this.interval.width - this.exposition;
      }

      return Math.floor(offset);
    },
    onScroll (params) {
      this.interval.offset = this._rebaseOffset(this.interval.offset + params.offsetX);
    },
  },
  computed: {
    // Pixel number includes zoom koof
    dpi () {
      return this.chart.width / this.interval.width * this.zoom.value;
    },
    // Current time exposition
    exposition () {
      return +((this.chart.width / this.dpi).toFixed(5));
    },
    // Coefficient of transformations native pixels to internal for X
    koofScreenX () {
      return ('clientWidth' in this) && (+this.clientWidth) !== 0 ? this.width / this.clientWidth : 1;
    },
    // Coefficient of transformations native pixels to internal for Y
    koofScreenY () {
      return this._calcKoofScreenY();
    },
    // Base for font height
    fontHeight () {
      return this.koofScreenY > 0 ? 16 * this.koofScreenY : 16;
    }
  }
};
