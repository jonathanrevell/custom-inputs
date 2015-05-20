(function(exports) {

  var Dropdown = function( el, options ) {
    options       = options || {};
    this.$el      = $(el);

    this._value         = null;
    this._selectedIndex = 0;
    this._open          = false;
    this.choices        = options.choices || [];

    // positions: below, over, aligned
    this._position      = options.position || 'below';

    this.initialize( options );
  };


  Dropdown.prototype = {

    initialize: function( options ) {
      var _this = this;

      this.setupDOM( options );
      this.$display.click( function(ev) {
        _this.onClick();
      });
      this.$choices.click( function(ev) {
        _this.onClickOption(ev.target);
      });
    },
    setupDOM: function(options)  {
      this.$display     = this.$el.find('>:first-child');
      this.$list        = this.$el.find('ul');
      if(this.$list.length === 0) {
        this.$list = this.$el.find('ol');
      }
      this.$choices     = this.$el.find('li');

      if( !options.choices ) {
        this.buildChoicesFromDOM();
      }
      this.assignIDs();
      this.computeWidth();
    },
    computeWidth: function() {
      var listWidth     = this.$list.outerWidth(),
          displayWidth  = this.$display.outerWidth();

      if(listWidth < displayWidth) {
        // this.$list.css('min-width', displayWidth);
        this.$list.width(displayWidth);
      } else {
        // this.$display.css('min-width', listWidth);
        this.$display.width(listWidth);
      }
    },
    buildChoicesFromDOM: function() {
      this.choices = _.map( this.$choices, function(option) {
        return $(option).text();
      });
    },
    assignIDs: function() {
      var counter = 0;
      this.$choices.attr('choice-id','');
      _.each(this.$choices, function(option) {
        $(option).attr('choice-id',counter);
        counter++;
      });
    },
    onClick: function() {
      this.open = !this.open;
    },
    onClickOption: function( option ) {
      var $option = $(option),
          idx     = $option.attr('choice-id');

      this.setSelectedIndex( idx );
      this.open = false;
    },
    setSelectedIndex: function( idx ) {
      var val = this.choices[idx];

      this._selectedIndex = idx;
      this.$display.text( val );
      this.$choices.attr('selected',false);
      $(this.$choices[idx]).attr('selected',true);
    },
    positionDropdown: function() {
      // positions: below, over, aligned
      var baseHeight      = this.$el.outerHeight(),
          baseOffset      = this.$el.offset(),
          listOffset      = this.$list.offset(),
          listItemHeight  = $(this.$choices[0]).outerHeight(),
          top, left;

      switch(this._position) {
        case "below":
          top     = baseOffset.top + baseHeight;
          break;
        case "over":
          top     = baseOffset.top;
          break;
        case "aligned":
          top     = baseOffset.top - (this._selectedIndex * listItemHeight);
          break;
      }

      this.$list.offset({
        top:  top,
        left: listOffset.left
      });
    },
    get value() {
      return this._value;
    },
    set value( val ) {
      var idx = null;

      if (_.isNumber(val)) {
        idx = val;
      } else {
        idx = this.choices.indexOf(val);
      }

      if(idx && idx > -1) {
        this.setSelectedIndex(idx);
      }
    },
    set open( val ) {
      this.$el.attr('open', val);
      this._open = val;
      if(val) {
        this.positionDropdown();
      }
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
