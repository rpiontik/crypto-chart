<template>
  <svg :view-box.camel="[0, 0, width, height]">
    <line x1="0" :x2="width" stroke="black" opacity="0.3"/>
    <g>
      <path class="candles-path-volume" fill="transparent" stroke="black" :d="navigatorPath"/>
    </g>
    <g>
      <path stroke="black" :d="left"/>
      <path stroke="black" :d="right"/>
    </g>
    <line x1="0" :x2="width" :y1="height" :y2="height" stroke="black" opacity="0.3"/>
  </svg>
</template>

<script>
  export default {
    name: 'chart-navigator',
    props: {
      width: {
        type: Number,
        required: true
      },
      height: {
        type: Number,
        required: false,
        default: 50
      },
      average: {
        required: true
      },
      offset: {
        type: Number,
        required: true
      },
      exposition: {
        type: Number,
        required: true
      }
    },
    computed: {
      navigatorPath () {
        return this.average.path && this.average.path.join() || '';
      },
      xMultiplier () {
        return this.width / (this.average.maxTimestamp - this.average.minTimestamp);
      },
      left () {
        let x = ((this.offset) - this.average.minTimestamp) * this.xMultiplier;
        return `M${x} 0, L${x - 6} 0, L${x - 6} ${this.height}, L${x} ${this.height}`
      },
      right () {
        let x = ((this.offset) - this.average.minTimestamp + this.exposition) * this.xMultiplier;
        return `M${x} 0, L${x + 6} 0, L${x + 6} ${this.height}, L${x} ${this.height}`
      }
    }
  };
</script>

<style scoped>

</style>