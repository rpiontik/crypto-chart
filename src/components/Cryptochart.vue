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
        <g v-if="candles" :transform="`translate(0, ${this.offsets.chartOffset})`">
          <path class="candles-path-positive" :d="positiveCandlesPath"/>
          <path class="candles-path-negative" :d="negativeCandlesPath"/>
          <path class="candles-path-volume" :d="volumeCandlesPath"/>
          <g v-if="interactive.hoverCandle">
            <path class="candles-path-volume hover"
                  :d="candles.volumePath[interactive.hoverCandle.volumePathIndex]"/>
            <path v-if="interactive.hoverCandle.class == 'negative'" class="candles-path-negative hover"
                  :d="candles.candlesNegativePath[interactive.hoverCandle.candlePathIndex]"/>
            <path v-else-if="interactive.hoverCandle.class == 'positive'" class="candles-path-positive hover"
                  :d="candles.candlesPositivePath[interactive.hoverCandle.candlePathIndex]"/>
          </g>
        </g>
        <axis-y :candles="candles" :chart-height="chart.height" :chart-width="chart.width" :chart-offset="offsets.chartOffset"/>
        <axis-x :chart-height="chart.height" :chart-width="chart.width" :time-parts="zoom.time_parts" :exposition="exposition"
                :offset="interval.offset" :dpi="dpi" :candleWidth="candles && candles.width || 3" :chart-offset="offsets.chartOffset"/>
        <crosshair :chart-height="chart.height" :chart-width="chart.width" :chart-offset="offsets.chartOffset"
                   :candles="candles" :interactive="interactive" />
      </g>
    </svg>
    <navigator :width="chart.width" :average="average" :offset="interval.offset" :exposition="exposition"/>
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
  import MixinOptions from '../mixins/options';

  import AxisX from "./Axis/axisX";
  import AxisY from "./Axis/axisY";
  import Crosshair from "./Intercative/Crosshair"
  import Navigator from "./Navigator/Navigator"

  export default {
    name: 'crypto-chart',
    mixins: [
      MixinScreen,
      MixinProps,
      MixinEventsMouse,
      MixinEventsTouche,
      MixinEventsWheel,
      MixinFilters,
      MixinWorkers,
      MixinOptions
    ],
    components: {
      AxisX,
      AxisY,
      Crosshair,
      Navigator
    },
    data() {
      return {
        chartData: this.data,
        candles: null,
        average: [],
        interactive: {
          hoverCandle: null,
          cursorX: 0,
          cursorY: 0
        }
      };
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
            if ((this.interactive.cursorX >= candle.x) && (this.interactive.cursorX <= candle.x + this.candles.width - this.candles.width * 0.25)) {
              this.interactive.hoverCandle = candle;
            }
          });
        }
      },
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
