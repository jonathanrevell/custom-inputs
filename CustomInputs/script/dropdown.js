(function(exports) {



  var Dropdown = function( el ) {
    this.$el      = $(el);

    this._value     = null;
    this._open      = false;
    this.options    = [];

    this.initialize();
  };


  Dropdown.prototype = {

    initialize: function() {
      var _this = this;

      this.setupDOM();
      this.$el.click( function() {
        _this.onClick();
      });
    },
    setupDOM: function()  {
      this.$display = this.$el.find('>:first-child');

    },
    onClick: function() {
      this.open = !this.open;
    },
    set open( val ) {
      this.$el.attr('open', val);
      this._open = val;
    },
    get open() {
      return this._open;
    }
  };

  $(document).ready(function() {
    var elements = $('[cx-dropdown]');
    _.each(elements, function( el ) {
      var dropdown = new Dropdown(el);
    });
  });

})(window);
