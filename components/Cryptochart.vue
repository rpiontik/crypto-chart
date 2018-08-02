<template>
  <svg
          class="cryptochart"
          :view-box.camel="[0, 0, width, height]"
          @mousedown.prevent="onMouseDown"
          @mousemove.prevent="onMouseMove"
          @mouseup.prevent="onMouseUp"
          @mouseleave.prevent="onMouseUp"
          @touchstart.prevent="onTouch"
          @touchmove.prevent="onTouch"
          @touchend.prevent="onTouch"
          @touchcancel.prevent="onTouch"

  >

    <g :transform="['translate(' + chart.offset.left, chart.offset.top + ')']">

      <g>
        <rect class="axis-border" :width="chart.width" :height="chart.height"></rect>

        <g
                v-for="price in axisY"
                :transform="['translate(0', price.y + ')']"
        >
          <line :x2="chart.width" y2="0" class="axis-y" opacity="0.1"></line>
          <text
                  :x="-10"
                  :dy="fontSizeAxisY / 2"
                  :font-size="fontSizeAxisY * 0.75"
                  text-anchor = 'end'
          >
            {{price.price | price}}
          </text>
        </g>

        <g
                v-for="time in axisX"
                :transform="['translate(' + time.x, '0)']"
                :key="time.time"
        >
          <line :y2="chart.height" x2="0" class="axis-x" opacity="0.1"></line>
          <text
                  :y="chart.height + fontSizeAxisX"
                  style="text-anchor: middle;"
                  :font-size="fontSizeAxisX"
          >
            {{time.time | time(zoom.curr_time_part)}}
          </text>
        </g>
      </g>
      <g v-if="candles">
        <path class="cross" :d="crossPath" />
        <path class="candles-path-positive" :d="positiveCandlesPath" />
        <path class="candles-path-negative" :d="negativeCandlesPath" />
        <path class="candles-path-volume" :d="volumeCandlesPath" />
        <template v-if="interactive.hoverCandle">
          <path class="candles-path-volume hover"
                :d="candles.volumePath[interactive.hoverCandle.volumePathIndex]" />
          <path v-if="interactive.hoverCandle.class == 'negative'" class="candles-path-negative hover"
                :d="candles.candlesNegativePath[interactive.hoverCandle.candlePathIndex]" />
          <path v-else-if="interactive.hoverCandle.class == 'positive'" class="candles-path-positive hover"
                :d="candles.candlesPositivePath[interactive.hoverCandle.candlePathIndex]" />
        </template>
      </g>
      <template v-if="interactive.hoverCandle">
        <text
                v-if="interactive.hoverCandle"
                :y="chart.offset.top + 10"
                :x="10"
                style="text-anchor: start;"
                :font-size="fontSizeAxisX"
        >
          O: {{interactive.hoverCandle.open.toFixed(6)}}
          H: {{interactive.hoverCandle.high.toFixed(6)}}
          L: {{interactive.hoverCandle.low.toFixed(6)}}
          C: {{interactive.hoverCandle.close.toFixed(6)}}
          Vol: {{interactive.hoverCandle.volume.toFixed(6)}}
        </text>
        <g class="price-label" :transform="['translate(-3', interactive.mouseY + ')']">
          <path d="M-36 -6 L-6 -6 L0 0 L-6 6 L-36 6" />
          <text x="-6" :y="fontSizeAxisY * 0.33" :font-size="fontSizeAxisY * 0.70">{{currentPrice | price}}</text>
        </g>
        <g class="moment-label" :transform="['translate(' + interactive.mouseX, chart.height + ')']">
          <path d="M-36 0 L36 0 L36 24 L-36 24" />
          <text :y="fontSizeAxisY * 0.9" :font-size="fontSizeAxisY * 0.70">{{interactive.hoverCandle.timestamp | moment}}</text>
        </g>

      </template>
    </g>
  </svg>
</template>

<script>
  import ChartWorker from 'worker-loader!@/kernel/webWorkers/ChartWorker.js';
  import cloneDeep from 'lodash.clonedeep';

  export default {
    name: 'cryptochart',
    props: {
      data: {
        type: Array,
        required: true
      },
      'box-width': {
        type: Number,
        required: true
      },
      'box-height': {
        type: Number,
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
        this.worker.chartWorker.postMessage({
          task: 'SET-PARAMS',
          params: {
            candleWidths: this.availableCandleWidths
          }
        });
        this.zoom.value = this.rebaseZoom(this.zoom.value);
        this.doRemakeCandles();
      },
      availableIntervals (value) {
        this.zoom.time_parts = value;
        this.zoom.value = this.rebaseZoom(this.zoom.value);
        this.doRemakeCandles();
      },
      data (value) {
        this.chartData = value;
      },
      'zoom.value' () {
        this.doRemakeCandles();
      },
      'interval.offset' () {
        this.doRemakeCandles();
      }
    },
    computed: {

      positiveCandlesPath () {
        let result = this.candles.candlesPositivePath;
        if (this.interactive.hoverCandle && this.interactive.hoverCandle.class === 'positive') {
          result = cloneDeep(result);
          result.splice(this.interactive.hoverCandle.candlePathIndex, 1);
        }
        return result.join();
      },

      negativeCandlesPath () {
        let result = this.candles.candlesNegativePath;
        if (this.interactive.hoverCandle && this.interactive.hoverCandle.class === 'negative') {
          result = cloneDeep(result);
          result.splice(this.interactive.hoverCandle.candlePathIndex, 1);
        }
        return result.join();
      },

      volumeCandlesPath () {
        let result = this.candles.volumePath;
        if (this.interactive.hoverCandle) {
          result = result.slice();
          result.splice(this.interactive.hoverCandle.volumePathIndex, 1);
        }
        return result.join();
      },

      // Количество точек на секунду с учетом зума
      dpi () {
        return this.chart.width / this.interval.width * this.zoom.value;
      },

      // Экспозиция времени отображаемая на графике с учетом зума
      exposition () {
        return 1 * (this.chart.width / this.dpi).toFixed(5);
      },

      crossPath () {
        if (!this.interactive.hoverCandle) {
          return '';
        }
        let x = this.interactive.hoverCandle.x + this.candles.width * 0.25;
        return `M${x} 0 L${x} ${this.chart.height} ` +
          `M0 ${this.interactive.mouseY} L${this.chart.width} ${this.interactive.mouseY} `
          ;
      },

      currentPrice () {
        return this.candles.high - (this.candles.high - this.candles.low) *
          (this.interactive.mouseY / this.chart.height);
      },

      // Ось Y
      axisY () {
        if (!this.candles) {
          return [];
        }
        let stepY = this.chart.height / 10;
        let stepPrice = (this.candles.high - this.candles.low) / 10;
        let result = [];

        for (let f = 0, y = this.chart.height - this.fontHeight * 0.25, price = this.candles.low;
             f < 11;
             y -= stepY, price += stepPrice, f++) {
          result.push({
            y: y,
            price: price
          });
        }
        return result;
      },
      // Ось X
      axisX () {
        let timePart = null;
        let partsNumber = null;
        let result = [];

        this.zoom.time_parts.map((candidate) => {
          let candidatePartsNumber = this.exposition / candidate;

          if (
            (partsNumber == null || candidatePartsNumber > partsNumber) &&
            candidatePartsNumber <= this.zoom.max_parts
          ) {
            timePart = candidate;
            partsNumber = candidatePartsNumber;
          }
        });

        if (!timePart) {
          timePart = this.zoom.time_parts[this.zoom.time_parts.length - 1] || 1;
        }

        for (
          let moment = this.interval.offset - (this.interval.offset % timePart);
          moment < this.interval.offset + this.exposition;
          moment += timePart
        ) {
          if (moment <= this.interval.offset) {
            continue;
          }

          result.push({
            x: (moment - this.interval.offset) * this.dpi,
            time: moment
          });
        }

        this.zoom.curr_time_part = timePart;
        return result;
      },
      // Коэфициент преобразования реальных точек во внутренние по ширине
      koofScreenX () {
        return ('clientWidth' in this) && (+this.clientWidth) !== 0 ? this.width / this.clientWidth : 1;
      },
      // Коэфициент преобразования реальных точек во внутренние по высоте
      koofScreenY () {
        return (+this.clientHeight) !== 0 ? this.height / this.clientHeight : 0;
      },
      fontHeight () {
        return this.koofScreenY > 0 ? 16 * this.koofScreenY : 16;
      },

      // Логическая единица
      inch () {
        return this.koofScreenX > 0 ? this.koofScreenX : 1;
      },

      fontSizeAxisY () {
        return this.fontHeight < (this.chart.offset.left / 6) ? this.chart.offset.left / 6 : this.fontHeight;
      },

      fontSizeAxisX () {
        return this.fontHeight > (this.clientWidth / 16) ? this.clientWidth / 16 : this.fontHeight;
      }
    },
    mounted () {
      this.onResize();
    },
    created () {
      window.addEventListener('mousewheel', this.proxyScrollEvent);
      window.addEventListener('resize', this.onResize);
    },
    destroyed () {
      window.removeEventListener('mousewheel', this.proxyScrollEvent);
      window.removeEventListener('resize', this.onResize);
    },
    methods: {
      doRemakeCandles () {
        this.worker.chartWorker.postMessage({
          task: 'RENDER',
          offset: this.interval.offset,
          exposition: this.exposition,
          viewWidth: this.chart.width,
          viewHeight: this.chart.height
        });
      },
      onChartWorkerMessage (message) {
        switch (message.data.type) {
          case 'APPENDED' : {
            this.doRemakeCandles();
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
            // this.candles = message.data.body;
            break;
          }
          default: break;
        }
      },
      rebaseZoomByParams (params, zoom) {
        let maxPart = params.zoom.time_parts[params.zoom.time_parts.length - 1];
        let minZoom = params.interval.width / (maxPart * params.zoom.max_parts);
        let result = zoom < minZoom ? minZoom : zoom;

        if (this.candleWidths && this.candleWidths.length) {
          let maxCandleWidth = this.candleWidths[this.candleWidths.length - 1];
          minZoom = params.interval.width / (maxCandleWidth * this.chart.width / 3);
          result = result < minZoom ? minZoom : result;
        }
        return result;
      },
      rebaseZoom (zoom) {
        return this.rebaseZoomByParams(this, zoom);
      },
      onZoom (delta, event) {
        let oldExposition = this.exposition;
        switch (delta) {
          case -1:
            this.zoom.value = this.rebaseZoom(this.zoom.value / this.zoom.step);
            break;
          case 1:
            this.zoom.value = this.rebaseZoom(this.zoom.value * this.zoom.step);
            break;
        }
        if (this.zoom.value <= 1) {
          this.zoom.value = 1;
        }
        this.interval.offset = this.rebaseOffset(
          this.interval.offset + (oldExposition - this.exposition) *
          ((event.offsetX * this.koofScreenX - this.chart.offset.left) / this.chart.width)
        );
      },
      onTouch (evt) {
        evt.preventDefault();
        if (evt.touches.length > 1 || (evt.type === 'touchend' && evt.touches.length > 0)) {
          let calcDistance = () => {
            let deltaX = Math.abs(evt.targetTouches[0].screenX - evt.targetTouches[1].screenX);
            let deltaY = Math.abs(evt.targetTouches[0].screenY - evt.targetTouches[1].screenY);
            return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          };
          switch (evt.type) {
            case 'touchstart':
              if (evt.targetTouches.length > 1) {
                this.zoom.toucheStartDistance = calcDistance();
                this.zoom.toucheStartValue = this.zoom.value;
              } else {
                this.zoom.toucheStartDistance = -evt.targetTouches.length;
              }
              break;
            case 'touchmove':
              if (this.zoom.toucheStartDistance >= 0) {
                this.zoom.value = this.zoom.toucheStartValue * (Math.abs(calcDistance() / this.zoom.toucheStartDistance));
              }
              break;
            case 'touchend':
              this.zoom.toucheStartDistance = -1;
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
            break;
        }

        newEvt.initMouseEvent(type, true, true, document.defaultView, 0,
          touch.screenX, touch.screenY, touch.clientX, touch.clientY,
          evt.ctrlKey, evt.altKey, evt.shiftKey, evt.metaKey, 0, null);

        evt.target.dispatchEvent(newEvt);
      },
      onMouseDown (event) {
        this.scrolling.clientX = event.clientX;
        this.scrolling.clientY = event.clientY;
        this.scrolling.isScrolling = true;
      },
      onMouseUp (event) {
        this.scrolling.isScrolling = false;
      },
      findHoverCandle () {
        if (this.candles) {
          this.candles.candles.map((candle) => {
            if ((this.interactive.mouseX >= candle.x) &&
              (this.interactive.mouseX <= candle.x + this.candles.width)) {
              this.interactive.hoverCandle = candle;
            }
          });
        }
      },
      onMouseMove (event) {
        this.interactive.mouseX = event.offsetX * this.koofScreenX - this.chart.offset.left;
        this.interactive.mouseY = event.offsetY * this.koofScreenY - this.chart.offset.top;
        this.findHoverCandle();
        if (this.scrolling.isScrolling) {
          this.scrolling.power = (this.scrolling.clientX - event.clientX) * this.koofScreenX;
          this.scrolling.clientX = event.clientX;
          this.interval.offset = this.rebaseOffset(
            this.interval.offset + this.scrolling.power / this.dpi
          );
        }
      },
      onResize () {
        this.clientWidth = this.$el.clientWidth;
        this.clientHeight = this.$el.clientHeight;
        this.height = this.clientWidth ? this.$el.clientHeight / this.clientWidth * this.width : 0;
        this.chart.offset.top = this.inch * 10;
        this.chart.height = this.height - this.chart.offset.top - this.fontSizeAxisX * 1.5;
      },
      rebaseOffset (offset) {
        if (offset < 0) {
          offset = 0;
        } else if (offset > this.interval.width - this.exposition) {
          offset = this.interval.width - this.exposition;
        }

        return Math.floor(offset);
      },
      proxyScrollEvent (event) {
        let e = window.event || event;
        let delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));

        if (e.path.indexOf(this.$el) >= 0) {
          this.onZoom(delta, e);
          e.preventDefault();
        }
      }
    },
    data () {
      let chartWorker = new ChartWorker({
        candleWidths: this.availableCandleWidths
      });
      chartWorker.onmessage = this.onChartWorkerMessage;
      chartWorker.postMessage({
        task: 'SET-PARAMS',
        params: {
          candleWidths: this.availableCandleWidths
        }
      });
      chartWorker.postMessage({task: 'APPEND', data: this.data});

      return {
        worker: {
          chartWorker,
          chartID: null,
          optimizer: null
        },
        chartData: this.data,
        width: 1000,
        height: 350,
        candles: null,
        interactive: {
          hoverCandle: null,
          mouseX: 0,
          mouseY: 0
        },
        zoom: {
          toucheStartDistance: 0,
          toucheStartValue: 0,
          value: this.intervalWidth / this.initExposition,       // Текущий зум
          step: 1.1,      // K преращение зума
          time_parts: this.availableIntervals, // Возможные дискретности времени на оси Х
          max_parts: 13,
          curr_time_part: 0
        },
        interval: {
          width: this.intervalWidth,
          offset: this.intervalStartOffset ? +this.intervalStartOffset : 0    // Смещение графика слева
        },
        chart: {
          height: 260,
          width: 940,
          offset: {
            top: 36,
            left: 60
          }
        },
        scrolling: {
          power: 0,
          isScrolling: false,
          clientX: 0,
          clientY: 0,
          inertTimer: setInterval(() => {
            if (!this.isScrolling && (Math.abs(this.scrolling.power) > 1)) {
              this.interval.offset = this.rebaseOffset(
                this.interval.offset + this.scrolling.power / this.dpi
              );
              this.scrolling.power /= 1.2;
            }
          }, 20)
        }
      };
    },
    filters: {
      day (timestamp) {
        return (timestamp - timestamp % 86400) / 86400 + 1;
      },
      time (timestamp, partTime) {
        let date = new Date(timestamp * 1000);
        let year = date.getUTCFullYear();
        let month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
        let day = ('0' + (date.getUTCDate())).slice(-2);
        let hours = ('0' + date.getHours()).slice(-2);
        let mins = ('0' + date.getMinutes()).slice(-2);
        let sec = ('0' + date.getSeconds()).slice(-2);
        if (partTime < 86400) {
          return `${hours}:${mins}:${sec}`;
        } else if (partTime <= 2592000) {
          return `${day}.${month}.${year}`;
        } else {
          return `${month}.${year}`;
        }
      },
      price (value) {
        return value ? value.toFixed(4) : 0;
      },
      moment (timestamp) {
        let date = new Date(timestamp * 1000);
        let year = date.getUTCFullYear();
        let month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
        let day = ('0' + (date.getUTCDate())).slice(-2);
        let hours = ('0' + date.getHours()).slice(-2);
        let mins = ('0' + date.getMinutes()).slice(-2);
        return `${day}.${month}.${year} ${hours}:${mins}`;
      }
    }
  };
</script>

<style lang="scss" scoped>

  .cryptochart {
    .axis-y, .axis-x, .axis-border {
      shape-rendering: crispEdges;
      stroke: #000;
      stroke-width: 1px;
      fill: none;
    }

    .candle {
      stroke-width: 1px;
    }

    .candles-path-volume {
      stroke: #990;
      fill: #990;
      opacity: 0.3;
    }

    .candles-path-volume.hover {
      stroke: #00f;
      fill: #00f;
    }

    .candles-path-positive {
      stroke: #090;
      fill: #090;
    }

    .candles-path-positive.hover {
      stroke: #0f0;
      fill: #0f0;
    }

    .candles-path-negative {
      stroke: #900;
      fill: #900;
    }

    .candles-path-negative.hover {
      stroke: #f00;
      fill: #f00;
    }

    .cross {
      fill: none;
      stroke: rgb(51, 51, 51);
      stroke-width: 1;
      stroke-dasharray: 1, 3;
      visibility: visible;
    }

    .price-label {
      path {
        fill: #440000;
        stroke: #440000;
        opacity: 0.5;
      }
      text {
        stroke: none;
        fill: #fff;
        text-anchor: end;
      }
    }

    .moment-label {
      path {
        fill: #333;
        stroke: #333;
        opacity: 0.5;
      }
      text {
        stroke: none;
        fill: #fff;
        text-anchor: middle;
      }
    }

  }

</style>
