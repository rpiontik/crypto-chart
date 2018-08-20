<template>
  <div>
    <svg class="crypto-chart"
         :view-box.camel="[0, 0, width, height]"
         @mousedown.prevent="_onMixinMouse"
         @mousemove.prevent="_onMixinMouse"
         @mouseup.prevent="_onMixinMouse"
         @mouseleave.prevent="_onMixinMouse"
         @touchstart.prevent="_onMixinTouch"
         @touchmove.prevent="_onMixinTouch"
         @touchend.prevent="_onMixinTouch"
         @touchcancel.prevent="_onMixinTouch"
    >
      <!--main chart group-->
      <g>
        <g v-if="interactive.hoverCandle">
          <text :y="15" :x="8" style="text-anchor: start;" :font-size="12">
            O: {{interactive.hoverCandle.open.toFixed(6)}}
            H: {{interactive.hoverCandle.high.toFixed(6)}}
            L: {{interactive.hoverCandle.low.toFixed(6)}}
            C: {{interactive.hoverCandle.close.toFixed(6)}}
            Vol: {{interactive.hoverCandle.volume.toFixed(6)}}
          </text>
        </g>
        <!--<g>-->
          <!--<line :x1="0" :x2="chart.width" :y1="this.offsets.chartOffset" :y2="this.offsets.chartOffset" stroke="black"/>-->
        <!--</g>-->
        <g v-if="candles" :transform="`translate(0, ${this.offsets.chartOffset})`">
          <path class="cross" :d="crossPath"/>
          <path class="candles-path-positive" :d="positiveCandlesPath"/>
          <path class="candles-path-negative" :d="negativeCandlesPath"/>
          <path class="candles-path-volume" :d="volumeCandlesPath"/>
          <template v-if="interactive.hoverCandle">
            <path class="candles-path-volume hover"
                  :d="candles.volumePath[interactive.hoverCandle.volumePathIndex]"/>
            <path v-if="interactive.hoverCandle.class == 'negative'" class="candles-path-negative hover"
                  :d="candles.candlesNegativePath[interactive.hoverCandle.candlePathIndex]"/>
            <path v-else-if="interactive.hoverCandle.class == 'positive'" class="candles-path-positive hover"
                  :d="candles.candlesPositivePath[interactive.hoverCandle.candlePathIndex]"/>
          </template>
        </g>
        <g>
          <line :x1="0" :x2="chart.width"
                :y1="chart.height - offsets.chartOffset" :y2="chart.height - offsets.chartOffset"
                stroke="black" opacity="0.3"/>
        </g>
        <g>
          <!--<rect class="axis-border" :width="chart.width" :height="chart.height"></rect>-->
          <g v-for="price in axisY" :transform="['translate(0', price.y + 10 + ')']">
            <!--<line :x="chart.width" :dy="fontSizeAxisY / 2" opacity="0.3"></line>-->
            <text :x="chart.width" :dy="fontSizeAxisY / 2" :font-size="fontSizeAxisY * 0.75" text-anchor='end'>
              {{price.price | price}}
            </text>
          </g>
        </g>
        <axis-x :height="chart.height" :time-parts="zoom.time_parts" :exposition="exposition"
                :offset="interval.offset" :dpi="dpi" :candleWidth="candles && candles.width || 3"/>
        <template v-if="interactive.hoverCandle">
          <g class="price-label" :transform="`translate(${chart.width}, ${interactive.cursorY})`">
            <path d="M-70 -10 L0 -10 L0 0 L0 10 L-70 10"/>
            <text x="-6" :y="fontSizeAxisY * 0.33" :font-size="fontSizeAxisY * 0.70">{{currentPrice | price}}</text>
          </g>
          <g class="moment-label" :transform="`translate(${interactive.cursorX}, ${chart.height - this.offsets.chartOffset})`">
            <path d="M-50 0 L50 0 L50 24 L-50 24"/>
            <text :y="fontSizeAxisY * 0.9" :font-size="10">{{interactive.hoverCandle.timestamp | moment}}
            </text>
          </g>
        </template>
      </g>
    </svg>
  </div>
</template>

<script>
  import cloneDeep from 'lodash.clonedeep';
  import MixinScreen from '../mixins/screen';
  import MixinEventsMouse from '../mixins/events-mouse';
  import MixinEventsTouche from '../mixins/events-touch';
  import MixinEventsWheel from '../mixins/events-wheel';
  import MixinFilters from '../mixins/filters';
  import MixinProps from '../mixins/props';
  import MixinWorkers from '../mixins/workers';

  import AxisX from "./Screen/axisX";

  export default {
    name: 'crypto-chart',
    mixins: [
      MixinScreen,
      MixinProps,
      MixinEventsMouse,
      MixinEventsTouche,
      MixinEventsWheel,
      MixinFilters,
      MixinWorkers
    ],
    components: {
      AxisX
    },
    computed: {
      positiveCandlesPath() {
        let result = this.candles.candlesPositivePath;
        if (this.interactive.hoverCandle && this.interactive.hoverCandle.class === 'positive') {
          result = cloneDeep(result);
          result.splice(this.interactive.hoverCandle.candlePathIndex, 1);
        }
        return result.join();
      },
      negativeCandlesPath() {
        let result = this.candles.candlesNegativePath;
        if (this.interactive.hoverCandle && this.interactive.hoverCandle.class === 'negative') {
          result = cloneDeep(result);
          result.splice(this.interactive.hoverCandle.candlePathIndex, 1);
        }
        return result.join();
      },
      volumeCandlesPath() {
        let result = this.candles.volumePath;
        if (this.interactive.hoverCandle) {
          result = result.slice();
          result.splice(this.interactive.hoverCandle.volumePathIndex, 1);
        }
        return result.join();
      },
      crossPath() {
        if (!this.interactive.hoverCandle) {
          return '';
        }
        let x = this.interactive.hoverCandle.x + this.candles.width * 0.25;
        return `M${x} 0 L${x} ${this.chart.height} ` +
          `M0 ${this.interactive.cursorY - this.offsets.chartOffset} L${this.chart.width} ${this.interactive.cursorY - this.offsets.chartOffset} `
          ;
      },
      currentPrice() {
        return this.candles.high - (this.candles.high - this.candles.low) *
          (this.interactive.cursorY / this.chart.height);
      },
      // Ось Y
      axisY() {
        if (!this.candles) {
          return [];
        }
        let stepY = this.chart.height / 10;
        let stepPrice = (this.candles.high - this.candles.low) / 10;
        let result = [];

        for (let f = 0, y = this.chart.height, price = this.candles.low;
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
      // axisX() {
      //   let timePart = null;
      //   let partsNumber = null;
      //   let result = [];
      //
      //   this.zoom.time_parts.map((candidate) => {
      //     let candidatePartsNumber = this.exposition / (candidate * 2);
      //
      //     if (
      //       (partsNumber == null || candidatePartsNumber > partsNumber) &&
      //       candidatePartsNumber <= this.zoom.time_parts.length
      //     ) {
      //       timePart = candidate;
      //       partsNumber = candidatePartsNumber;
      //     }
      //   });
      //
      //   if (!timePart) {
      //     timePart = this.zoom.time_parts[this.zoom.time_parts.length - 1] || 1;
      //   }
      //
      //   for (
      //     let moment = this.interval.offset - (this.interval.offset % timePart);
      //     moment < this.interval.offset + this.exposition;
      //     moment += timePart
      //   ) {
      //     if (moment <= this.interval.offset) {
      //       continue;
      //     }
      //
      //     result.push({
      //       x: (moment - this.interval.offset) * this.dpi,
      //       time: moment
      //     });
      //   }
      //
      //   this.zoom.curr_time_part = timePart;
      //   return result;
      // },

      fontSizeAxisY() {
        return this.fontHeight < (this.chart.offset.left / 6) ? this.chart.offset.left / 6 : this.fontHeight;
      },

      fontSizeAxisX() {
        return this.fontHeight > (this.clientWidth / 16) ? this.clientWidth / 16 : this.fontHeight;
      }
    },
    methods: {
      onRedraw() {
        for (let worker in this.workers)
          this.workers[worker].redraw();
      },

      onHover(params) {
        this.interactive.cursorX = params.x;
        this.interactive.cursorY = params.y;
        this.findHoverCandle();
      },
      findHoverCandle() {
        if (this.candles) {
          this.candles.candles.map((candle) => {
            if ((this.interactive.cursorX >= candle.x) && (this.interactive.cursorX <= candle.x + this.candles.width)) {
              this.interactive.hoverCandle = candle;
            }
          });
        }
      },
    },
    data() {
      return {
        chartData: this.data,
        candles: null,
        interactive: {
          hoverCandle: null,
          cursorX: 0,
          cursorY: 0
        }
      };
    }
  };
</script>

<style lang="scss">

  .crypto-chart {
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
      stroke: rgba(21, 101, 192, 0.16);
      fill: rgba(21, 101, 192, 0.16);
    }

    .candles-path-volume.hover {
      stroke: rgba(21, 101, 192, 0.16);
      fill: rgba(21, 101, 192, 0.16);
    }

    .candles-path-positive {
      stroke: rgba(104, 159, 56, 1);
      fill: rgba(104, 159, 56, 1);
    }

    .candles-path-positive.hover {
      stroke: rgba(104, 230, 56, 0.8);
      fill: rgba(104, 230, 56, 0.8);
    }

    .candles-path-negative {
      stroke: rgba(211, 47, 47, 1);
      fill: rgba(211, 47, 47, 1);
    }

    .candles-path-negative.hover {
      stroke: rgba(230, 47, 47, 1);
      fill: rgba(255, 60, 60, 1);
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
