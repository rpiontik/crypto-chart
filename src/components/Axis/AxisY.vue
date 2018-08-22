<template>
  <g>
    <g v-for="price in axisY" :transform="`translate(0, ${price.y + chartOffset})`">
      <line x1="0" :x2="chartWidth" class="axis-x" opacity="0.1"></line>
      <text :x="chartWidth" y="-4" font-size="10" text-anchor='end'> {{price.price | price}} </text>
    </g>
  </g>
</template>

<script>
  import Filters from '../../mixins/filters';
  export default {
    name: 'chart-axis-y',
    mixins: [Filters],
    props: {
      candles: {
        required: true
      },
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
      }
    },
    computed: {
      axisY() {
        if (!this.candles) {
          return [];
        }
        let height = this.chartHeight - this.chartOffset * 2;
        let stepY = height / 8;
        let stepPrice = (this.candles.high - this.candles.low) / 8;
        let result = [];

        for (let f = 0, y = height, price = this.candles.low;
             f < 9;
             y -= stepY, price += stepPrice, f++) {
          result.push({
            y: y,
            price: price
          });
        }
        return result;
      }
    }
  };
</script>

<style scoped>

</style>