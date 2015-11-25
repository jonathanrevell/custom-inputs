(function(exports) {

  var Dropdown = function( el, options ) {
    options       = options || {};
    this.$el      = $(el);

    this._value             = null;
    this._selectedIndex     = 0;
    this._highlightedIndex  = 0;
    this._open              = false;
    this.choices            = options.choices   || [];

    // isMenu: true / false
    var hasMenuAttr       = (this.$el.attr('cx-menu') !== undefined) ? true : false;
    this._isMenu          = options.isMenu || hasMenuAttr || false;

    // positions: below, over, aligned
    this._position        = options.position    || 'below';

    // mobileStyle: none, panel
    this._mobileStyle     = options.mobileStyle || 'panel';

    // openOnHover: true / false
    this._openOnHover     = options.openOnHover || false;
    if(this.$el.attr('open-on-hover') !== undefined) {
      this._openOnHover = true;
    }

    this._ignoreWidth     = options.ignoreWidth || false;
    if(this.$el.attr('ignore-width') !== undefined) {
      this._ignoreWidth = true;
    }

    // Click Handler
    var onSelectAttr;
    if (this.$el.attr('on-select') !== undefined) {
      onSelectAttr = function() {
        return eval( this.$el.attr('on-select'));
      };
    }
    this._onSelectEvent    = options.onSelect || onSelectAttr || null;


    // Perform the initialization tasks
    this.initialize( options );
  };


  Dropdown.prototype = {

    initialize: function( options ) {
      var _this = this;

      this.setupBaseDOM( options );
      this.bindBaseEvents();
    },
    bindBaseEvents: function() {
      var _this = this;
      this.$display.click( function(ev) {
        ev.stopPropagation();
        _this.onClick();
      });
      this.$el.blur(function(ev) {
        _this.open = false;
      });
      this.$el.on('keydown', function(ev) {
        _this.keyHandler( ev );
      });
      if(this._openOnHover) {
        var hoverOpenTimeout = null;

        this.$el.on('mouseenter', function(ev) {
          if(!hoverOpenTimeout) {
            hoverOpenTimeout = setTimeout(function() {
              _this.open = true;
            }, 100);
          }
        });
        this.$el.on('mouseleave', function(ev) {
          if(hoverOpenTimeout) {
            clearTimeout(hoverOpenTimeout);
            hoverOpenTimeout = null;
          }
          _this.open = false;
        });
      }
    },
    bindListEvents: function() {
      var _this = this;
      this.$choices.click( function(ev) {
        ev.stopPropagation();
        _this.onClickOption(ev.target);
      });
      this.$choices.on('mouseenter', function(ev) {
        var index = $(ev.target).attr('choice-id');
        _this.setHighlightedItem( index, true );
      });
    },
    keyHandler: function( ev ) {
      if(!this.open && (ev.which == 38 || ev.which == 40)) {
        this.open = true;
      } else {
        switch(ev.which) {
          case 38:    //38: Up Arrow
            this.handleKeyUpArrow( ev );
            break;
          case 40:    //40: Down Arrow
            this.handleKeyDownArrow( ev );
            break;
          case 13:    //13: Enter
          case 32:    //32: Space
            if(open) this.handleKeyConfirm( ev );
            break;
          case 27:    //27: Escape
            this.handleKeyCancel( ev );
            break;
          default:
            if(ev.which >= 48 && ev.which <= 90) {
              this.handleKeyAlphaNumeric( ev );     //Handle numbers and letters
            }
        }
      }
      ev.stopPropagation();
    },
    handleKeyUpArrow: function( ev ) {
      this.decrementHighlightedItem();
    },
    handleKeyDownArrow: function( ev ) {
      this.incrementHighlightedItem();
    },
    handleKeyConfirm: function( ev ) {
      this.selectHighlightedItem();
    },
    handleKeyCancel: function( ev ) {
      this.open = false;
    },
    handleKeyAlphaNumeric: function( ev ) {
      var char = String.fromCharCode(ev.keyCode).toLowerCase(),
          index = -1;

      index = _.findIndex( this.choices, function( choice ){
        return char == choice[0].toLowerCase();
      });

      if(index > -1) {
        this.setHighlightedItem( index );
      }
    },
    incrementHighlightedItem: function() {
      if(this._highlightedIndex < this.choices.length - 1) {
        this.setHighlightedItem( this._highlightedIndex + 1 );
      }
    },
    decrementHighlightedItem: function() {
      if(this._highlightedIndex > 0) {
        this.setHighlightedItem( this._highlightedIndex - 1 );
      }
    },
    selectHighlightedItem: function() {
      this.setSelectedIndex( this._highlightedIndex );
      this.open = false;
    },
    setHighlightedItem: function( index, isMouseTriggered ) {
      this._highlightedIndex = this.conformIndexToListBounds( index );
      this.$choices.removeClass('highlighted');

      var $highlighted = $(this.$choices[this._highlightedIndex]);
      $highlighted.addClass('highlighted');

      if(!isMouseTriggered) {
        this.$list.scrollTop( $highlighted.position().top );
      }
    },
    conformIndexToListBounds: function( index ) {
      if(_.isUndefined(index)) {
        index = 0;
      }
       if(index >= this.$choices.length) {
         index = this.$choices.length - 1;
       }
       if(index < 0) {
         index = 0;
       }
       return index;
    },
    setupBaseDOM: function(options) {
      this.$display     = this.$el.find('>:first-child');
      this.makeFocusable();
    },
    setupListDOM: function(options)  {
  this.$list        = this.$el.find('ul');

  if(this.$list.length === 0) {
    this.$list = this.$el.find('ol');
  }
  if(this.$list.length === 0) {
    this.$list = $(document.createElement('ul'));
    this.$el.append(this.$list);

  }
  this.$choices     = this.$el.find('li');

  if( !this.choices || this.choices.length === 0 ) {
    this.buildChoicesFromDOM();
  } else if( this.choices && this.choices.length > 0) {
    this.buildChoicesFromModel();
  }

  this.assignIDs();
  if(!this._ignoreWidth) {
    this.computeWidth();
  }
},
makeFocusable: function() {
  this.$el.attr('tabindex','0');
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
buildChoicesFromModel: function( ) {
  this.$list.empty();
  var mapped = _.map(this.choices, function( choice ) {
    return "<li>" + choice.toString() + "</li>";
  });
  this.$list.html( mapped.join('') );
  this.$choices     = this.$el.find('li');
},
    assignIDs: function() {
      var counter = 0;
      this.$choices.attr('choice-id','');
      _.each(this.$choices, function(option) {
        $(option).attr('choice-id',counter);
        counter++;
      });
    },
    onClick: _.throttle(function() {
      this.open = !this.open;
    }, 100),
    onClickOption: function( option ) {
      var $option = $(option),
          idx     = $option.attr('choice-id');

      this.setSelectedIndex( idx );
      this.open = false;
    },
    setSelectedIndex: function( idx ) {
      var val = this.choices[idx];

      if(this._isMenu) {
        console.log("Menu item clicked");
        if(this._onSelectEvent) {
          this._onSelectEvent({
            index:    idx,
            value:    val,
            dropdown: this
          });
        }

      } else {
        this._selectedIndex = idx;
        this._value         = this.choices[idx];
        this.$display.text( val );
        this.$choices.attr('selected',false);
        $(this.$choices[idx]).attr('selected',true);
      }
    },
    layoutDropdown: function() {
      if(!this.$list) {
        this.setupListDOM();
        this.bindListEvents();
      }

      if( this._mobileStyle === "panel") {
        this.$el.addClass('cx-mobile-panel');
      } else {
        this.$el.removeClass('cx-mobile-panel');
      }
      this.positionDropdown();
    },
    positionDropdown: function() {
      // positions: below, over, aligned
      var baseHeight      = this.$display.outerHeight(),
          baseOffset      = this.$display.offset(),
          listOffset      = this.$list.offset(),
          listWidth       = this.$list.width(),
          listItemHeight  = $(this.$choices[0]).outerHeight(),
          top, left;

      var windowWidth     = $(window).width(),
          windowHeight    = $(window).height();

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

      var horizontalExtent = listOffset.left + listWidth;
      var leftAdjustment = 0;
      if(horizontalExtent > windowWidth) {
        leftAdjustment = horizontalExtent - windowWidth + 10;
      }
      left = listOffset.left - leftAdjustment;

      this.$list.offset({
        top:  top,
        left: left
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
        this.$el.trigger('focus');
        this.layoutDropdown();
        this.setHighlightedItem( this._selectedIndex );
      }
    },
    get open() {
      return this._open;
    }
  };

  Dropdown.initAll = function() {
    var elements = $('[cx-dropdown]');
    _.each(elements, function( el ) {
      var dropdown = new Dropdown(el);
    });
  };

  exports.Dropdown = Dropdown;

  $(document).ready(function() {
    Dropdown.initAll();
  });

})(window);
