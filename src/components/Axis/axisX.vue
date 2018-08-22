<template>
  <g>
    <g v-for="time in axisX" :transform="`translate(${time.x}, 0)`" :key="time.time">
      <line :y1="chartHeight - 20" :y2="chartHeight - 15" :x1="xOffset" :x2="xOffset" class="axis-x" opacity="0.3"></line>
      <text :y="chartHeight - 5" style="text-anchor: middle;" font-size="10">
        {{time.time | time(timePart)}}
      </text>
    </g>
    <line :x1="0" :x2="chartWidth" :y1="chartHeight - chartOffset" :y2="chartHeight - chartOffset" stroke="black" opacity="0.3"/>
  </g>
</template>

<script>
  import Filters from '../../mixins/filters'
  export default {
    name: 'chart-axis-x',
    mixins: [Filters],
    props: {
      timeParts: {
        type: Array,
        required: true
      },
      exposition: {
        type: Number,
        required: true
      },
      offset: {
        type: Number,
        required: true
      },
      chartOffset: {
        type: Number,
        required: true
      },
      dpi: {
        type: Number,
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
      candleWidth: {
        type: Number,
        required: true
      }
    },
    data () {
      return {
        timePart: 0
      }
    },
    computed: {
      axisX() {
        let timePart = null;
        let partsNumber = null;
        let result = [];

        this.timeParts.map((candidate) => {
          let candidatePartsNumber = this.exposition / (candidate * 2);

          if (
            (partsNumber == null || candidatePartsNumber > partsNumber) &&
            candidatePartsNumber <= this.timeParts.length
          ) {
            timePart = candidate;
            partsNumber = candidatePartsNumber;
          }
        });

        if (!timePart) {
          timePart = this.timeParts[this.timeParts.length - 1] || 1;
        }

        for (
          let moment = this.offset - (this.offset % timePart);
          moment < this.offset + this.exposition;
          moment += timePart
        ) {
          if (moment <= this.offset) {
            continue;
          }

          result.push({
            x: (moment - this.offset) * this.dpi,
            time: moment
          });
        }

        this.timePart = timePart;
        return result;
      },
      xOffset () {
        return 0;
      }
    }
  };
</script>

<style scoped>
  .axis-y, .axis-x, .axis-border {
    shape-rendering: crispEdges;
    stroke: #000;
    stroke-width: 1px;
    fill: none;
  }
</style>