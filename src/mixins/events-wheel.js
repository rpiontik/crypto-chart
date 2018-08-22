const WHEEL_ZOOM_STEP = 0.1;
export default {
  mounted () {
    this.$el.addEventListener('mousewheel', this._onWhell);
  },
  methods: {
    _onWhell(event) {
      let e = window.event || event;
      if (e.path.indexOf(this.$el) < 0) {
        return;
      }
      let targetMoment = this.interval.offset + this.exposition * (event.layerX / this.chart.width);
      switch(Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)))){
        case 1:
          this.onZoom(1 + WHEEL_ZOOM_STEP, targetMoment);
          break;
        case -1:
          this.onZoom(1 - WHEEL_ZOOM_STEP, targetMoment);
          break;
      }
      e.preventDefault();
    }
  },
  destroyed () {
    this.$el.removeEventListener('mousewheel', this._onWhell);
  }
};
