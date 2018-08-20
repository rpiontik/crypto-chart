export default {
  filters: {
    day (timestamp) {
      return (timestamp - timestamp % 86400) / 86400 + 1;
    },
    time (timestamp, partTime) {
      let date = new Date(timestamp * 1e3);
      let year = date.getFullYear();
      let month = ('0' + (date.getMonth() + 1)).slice(-2);
      let day = ('0' + (date.getDate())).slice(-2);
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
      let date = new Date(timestamp * 1e3);
      let year = date.getUTCFullYear();
      let month = ('0' + (date.getMonth() + 1)).slice(-2);
      let day = ('0' + (date.getDate())).slice(-2);
      let hours = ('0' + date.getHours()).slice(-2);
      let mins = ('0' + date.getMinutes()).slice(-2);
      return `${day}.${month}.${year} ${hours}:${mins}`;
    }
  }
};
