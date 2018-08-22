<template>
  <g v-if="interactive.hoverCandle" :transform="`translate(0, ${chartOffset})`">
    <path class="cross" :d="crossPath"/>
    <g class="price-label" :transform="`translate(${chartWidth}, ${interactive.cursorY - this.chartOffset})`">
      <path d="M-70 -10 L0 -10 L0 0 L0 10 L-70 10"/>
      <text x="-6" :y="4" :font-size="10">{{currentPrice | price}}</text>
    </g>
    <g class="moment-label" :transform="`translate(${interactive.cursorX}, ${chartHeight - chartOffset * 2})`">
      <path d="M-50 0 L50 0 L50 24 L-50 24"/>
      <text :y="15" :font-size="10">{{interactive.hoverCandle.timestamp | moment}}
      </text>
    </g>
  </g>
</template>

<script>
  import Filters from '../../mixins/filters';
  export default {
    name: 'chart-interactive-crosshair',
    mixins: [Filters],
    props: {
      chartHeight: {
        type: Number,
        required: true
      },
      chartWidth: {
        type: Number,
        required: true
      },
      chartOffset: {
        type: Number,
        required: true
      },
      candles: {
        required: true
      },
      interactive: {
        required: true
      }
    },
    computed: {
      crossPath() {
        if (!this.interactive.hoverCandle) {
          return '';
        }
        let x = this.interactive.hoverCandle.x;
        return `M${x} 0 L${x} ${this.chartHeight - this.chartOffset * 2} ` +
          `M0 ${this.interactive.cursorY - this.chartOffset} L${this.chartWidth} ${this.interactive.cursorY - this.chartOffset} `
          ;
      },
      currentPrice() {
        let realHeight = this.chartHeight - this.chartOffset * 2;
        return this.candles.low + (this.candles.high - this.candles.low)  * (realHeight - this.interactive.cursorY + this.chartOffset) / realHeight;
      }
    }
  };
</script>

<style scoped>

</style>