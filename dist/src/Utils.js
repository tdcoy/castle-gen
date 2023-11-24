export const utils = (function () {
  return {
    Lerp: function (x, a, b) {
      return x * (b - a) + a;
    },

    Clamp: function (x, a, b) {
      return Math.min(Math.max(x, a), b);
    },

    Sat: function (x) {
      return Math.min(Math.max(x, 0.0), 1.0);
    },

    Rad2Deg: function () {
      return 180 / Math.PI;
    },

    Deg2Rad: function () {
      return Math.PI / 180;
    },

    RandomRange: function (min, max) {
      return Math.random() * (max - min) + min;
    },

    // Return random int where the Min is inclusive and Max is exclusive
    RandomRangeInt: function (min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    },

    RandomRangeInclusiveBounds: function (min, max) {
      return Math.random() < 0.5
        ? (1 - Math.random()) * (max - min) + min
        : Math.random() * (max - min) + min;
    },
  };
})();
