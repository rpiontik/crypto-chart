function calcDistance (touches) {
  if (touches.length) {
    let deltaX = Math.abs(touches[0].screenX - touches[1].screenX);
    let deltaY = Math.abs(touches[0].screenY - touches[1].screenY);
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  } else {
    return 0;
  }
}

export default {
  methods: {
    _onMixinTouch (evt) {
      evt.preventDefault();
      if (evt.touches.length > 1) {
        switch (evt.type) {
          case 'touchstart':
            this.eventsTouch.lastDistance  = calcDistance(evt.targetTouches);
            break;
          case 'touchmove':
            if (this.eventsTouch.lastDistance >= 0) {
              let new_dist = calcDistance(evt.targetTouches);
              let targetMoment = this.interval.offset + this.exposition * (evt.targetTouches[0].screenX / this.chart.width);
              if (this.eventsTouch.lastDistance && ('onZoom' in this)) {
                this.onZoom(Math.abs(new_dist / this.eventsTouch.lastDistance), targetMoment);
              }
              this.eventsTouch.lastDistance = new_dist;
            }
            break;
        }
        return;
      }

      let newEvt = document.createEvent('MouseEvents');
      let type = null;
      let touch = null;
      switch (evt.type) {
        case 'touchstart':
          type = 'mousedown';
          touch = evt.changedTouches[0];
          break;
        case 'touchmove':
          type = 'mousemove';
          touch = evt.changedTouches[0];
          break;
        case 'touchend':
          type = 'mouseup';
          touch = evt.changedTouches[0];
          this.eventsTouch.lastDistance = null;
          break;
      }

      newEvt.initMouseEvent(type, true, true, document.defaultView, 0,
        touch.screenX, touch.screenY, touch.clientX, touch.clientY,
        evt.ctrlKey, evt.altKey, evt.shiftKey, evt.metaKey, 0, null);

      evt.target.dispatchEvent(newEvt);
    },
  },
  data () {
    return {
      eventsTouch: {
        lastDistance : null,
      }
    }
  }
};
