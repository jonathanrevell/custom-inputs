(function(exports) {

  DROPDOWN_ZINDEX_SHIFT = 1000;     //  How much the dropdown will be pushed above elements with valid z-indexes
  DROPDOWN_DEFAULT_ZINDEX = 10000;  //  How far the dropdown will be placed by default when no z-index can be determined

  var Dropdown = function(el, options) {
    options = options || {};
    this.$el = $(el);

    this._value = null;
    this._selectedIndex = 0;
    this._highlightedIndex = 0;
    this._open = false;

    if (options.choices) {
      var choices = options.choices;

      // If the provided options were just a flat array of values
      if (choices.length > 0 && !choices[0].key) {
        choices = _.map(choices, function(choice) {
          return {
            key: choice,
            display: choice
          };
        });
      }

      // Assign the conformed options array
      this.choices = choices;

    } else {
      this.choices = [];
    }


    // isMenu: true / false
    var hasMenuAttr = (this.$el.attr('cx-menu') !== undefined) ? true : false;
    this._isMenu = options.isMenu || hasMenuAttr || false;

    // positions: below, over, aligned
    this._position = options.position || 'below';

    // mobileStyle: none, panel
    this._mobileStyle = options.mobileStyle || 'panel';

    // positions: below, over, aligned
    this._selfDestruct = options.selfDestruct || false;

    // openOnHover: true / false
    this._openOnHover = options.openOnHover || false;
    if (this.$el.attr('open-on-hover') !== undefined) {
      this._openOnHover = true;
    }

    this._ignoreWidth = options.ignoreWidth || false;
    if (this.$el.attr('ignore-width') !== undefined) {
      this._ignoreWidth = true;
    }

    // Click Handler
    var onSelectAttr;
    if (this.$el.attr('on-select') !== undefined) {
      onSelectAttr = function() {
        return eval(this.$el.attr('on-select'));
      };
    }
    this._onSelectEvent = options.onSelect || onSelectAttr || null;


    // Perform the initialization tasks
    this.initialize(options);
  };


  Dropdown.prototype = {

    initialize: function(options) {
      var _this = this;

      this.setupBaseDOM(options);
      this.bindBaseEvents();
    },
    bindBaseEvents: function() {
      var _this = this;
      this.$el.click(function(ev) {
        ev.stopPropagation();
        _this.onClick();
      });
      this.$el.on('keydown', function(ev) {
        _this.keyHandler(ev);
      });
      this.$el.blur(function(ev) {
        // We delay blur to allow clicks to take place first
        setTimeout( function() {
          _this.open = false;
        }, 150);
      });

      // Any events only to be applied on hover triggered dropdowns
      if (this._openOnHover) {
        var hoverOpenTimeout = null;        // Prevents multiple opens from triggering

        this.onMouseMove = _.throttle(function(ev) {
          if( !_this.isMouseWithinDropdown( ev )) {
            _this.open = false;
            _this.unbindOnMouseMove( ev );
          }
        }, 50);

        this.unbindOnMouseMove = function() {
          $(document.body).off('mousemove', this.onMouseMove);
        };

        this.bindOnMouseMove = function() {
          $(document.body).on('mousemove', this.onMouseMove);
        };

        this.onListMouseEnter = function(ev) {
          if (!hoverOpenTimeout && !_this.open) {
            hoverOpenTimeout = setTimeout(function() {

              _this.open = true;
              _this.bindOnMouseMove();
              hoverOpenTimeout = null;
            }, 50);
          }
        };
        this.onListMouseLeave = function(ev) {
          if (hoverOpenTimeout) {
            clearTimeout(hoverOpenTimeout);
            hoverOpenTimeout = null;
          }
          if(_this.open) {

            if( !_this.isMouseWithinDropdown( ev )) {

              _this.open = false;
            }
          }
        };

        this.$el.on('mouseenter', this.onListMouseEnter);
        this.$el.on('mouseleave', this.onListMouseLeave);
      }
    },
    unbindBaseEvents: function() {
      if(this.$el) {
        this.$el.off();
      }
      if(this.$list) {
        this.$list.off();
      }
      if(this.onMouseMove) {
        this.unbindOnMouseMove();
      }
    },
    bindListEvents: function() {
      var _this = this;
      this.$choices.click(function(ev) {
        ev.stopPropagation();
        _this.onClickOption(ev.target);
      });
      this.$choices.on('mouseenter', function(ev) {
        var index = $(ev.target).attr('choice-id');
        _this.setHighlightedItem(index, true);
      });

      if(this.onListMouseLeave) {
        this.$list.on('mouseenter', this.onListMouseEnter);
        this.$list.on('mouseleave', this.onListMouseLeave);
      }
    },
    unbindListEvents: function() {
      if(this.$choices) {
        this.$choices.off();
      }
    },
    isMouseWithinDropdown: function( ev ) {
      var cursor = {
        left: ev.pageX,
        top: ev.pageY
      };

      var withinList = ScreenGeometry.isPositionWithinElement( cursor, this.$list );
      var withinBase = ScreenGeometry.isPositionWithinElement( cursor, this.$el );

      return (withinBase || withinList);
    },
    keyHandler: function(ev) {
      if (!this.open && (ev.which == 38 || ev.which == 40)) {
        this.open = true;
      } else {
        switch (ev.which) {
          case 38: //38: Up Arrow
            this.handleKeyUpArrow(ev);
            break;
          case 40: //40: Down Arrow
            this.handleKeyDownArrow(ev);
            break;
          case 13: //13: Enter
          case 32: //32: Space
            if (open) this.handleKeyConfirm(ev);
            break;
          case 27: //27: Escape
            this.handleKeyCancel(ev);
            break;
          default:
            if (ev.which >= 48 && ev.which <= 90) {
              this.handleKeyAlphaNumeric(ev); //Handle numbers and letters
            }
        }
      }
      ev.stopPropagation();
    },
    handleKeyUpArrow: function(ev) {
      this.decrementHighlightedItem();
    },
    handleKeyDownArrow: function(ev) {
      this.incrementHighlightedItem();
    },
    handleKeyConfirm: function(ev) {
      this.selectHighlightedItem();
    },
    handleKeyCancel: function(ev) {
      this.open = false;
    },
    handleKeyAlphaNumeric: function(ev) {
      var char = String.fromCharCode(ev.keyCode).toLowerCase(),
        index = -1;

      index = _.findIndex(this.choices, function(choice) {
        return char == choice[0].display.toLowerCase();
      });

      if (index > -1) {
        this.setHighlightedItem(index);
      }
    },
    incrementHighlightedItem: function() {
      if (this._highlightedIndex < this.choices.length - 1) {
        this.setHighlightedItem(this._highlightedIndex + 1);
      }
    },
    decrementHighlightedItem: function() {
      if (this._highlightedIndex > 0) {
        this.setHighlightedItem(this._highlightedIndex - 1);
      }
    },
    selectHighlightedItem: function() {
      this.setSelectedIndex(this._highlightedIndex);
      this.open = false;
    },
    setHighlightedItem: function(index, isMouseTriggered) {
      this._highlightedIndex = this.conformIndexToListBounds(index);
      this.$choices.removeClass('highlighted');

      var $highlighted = $(this.$choices[this._highlightedIndex]);

      if($highlighted && $highlighted.length > 0) {
        $highlighted.addClass('highlighted');

        if (!isMouseTriggered) {
          this.$list.scrollTop($highlighted.position().top);
        }
      }
    },
    conformIndexToListBounds: function(index) {
      if (_.isUndefined(index)) {
        index = 0;
      }
      if (index >= this.$choices.length) {
        index = this.$choices.length - 1;
      }
      if (index < 0) {
        index = 0;
      }
      return index;
    },
    setupBaseDOM: function(options) {
      var $display = this.$el.find('>:first-child');
      var childCount = this.$el.children().length;
      var tagIsList = ($display.prop("tagName") == "UL" || $display.prop("tagName") == "OL");

      // If no valid display element is defined, just use the base element
      if(childCount === 0 || (childCount == 1 && tagIsList)) {
        $display = this.$el;
      }
      this.$display = $display;
      this.makeFocusable();
    },
    setupListDOM: function(options) {
      if(!this.$list || this.$list.length === 0) {
        this.$list = this.$el.find('ul');

        if (this.$list.length === 0) {
          this.$list = this.$el.find('ol');
        }
        if (this.$list.length === 0) {
          this.$list = $(document.createElement('ul'));
        }

        $(document.body).append(this.$list);

        this.$list.addClass("cx-dropdown-list");
        this.$choices = this.$list.find('li');
      }

      if (!this.choices || this.choices.length === 0) {
        this.buildChoicesFromDOM();
      } else if (this.choices && this.choices.length > 0) {
        this.buildChoicesFromModel();
      }

      this.assignIDs();
      if (!this._ignoreWidth) {
        this.computeWidth();
      }
    },
    makeFocusable: function() {
      this.$el.attr('tabindex', '0');
    },
    computeWidth: function() {
      var listWidth = this.$list.outerWidth(),
        displayWidth = this.$display.outerWidth();

      if (listWidth < displayWidth) {
        // this.$list.css('min-width', displayWidth);
        this.$list.width(displayWidth);
      } else {
        // this.$display.css('min-width', listWidth);
        this.$display.width(listWidth);
      }
    },
    buildChoicesFromDOM: function() {
      this.choices = _.map(this.$choices, function(option) {
        return {
          display: $(option).text(),
          key: $(option).text()
        };
      });
    },
    buildChoicesFromModel: function() {
      this.$list.empty();
      var mapped = _.map(this.choices, function(choice) {
        return "<li data-key='" + choice.key + "'>" + choice.display.toString() + "</li>";
      });
      this.$list.html(mapped.join(''));
      this.$choices = this.$list.find('li');
    },
    assignIDs: function() {
      var counter = 0;
      this.$choices.attr('choice-id', '');
      _.each(this.$choices, function(option) {
        $(option).attr('choice-id', counter);
        counter++;
      });
    },
    onClick: _.throttle(function() {
      this.open = !this.open;

      this.onClick.cancel();
    }, 100),
    onClickOption: function(option) {
      var $option = $(option),
          idx;

      // Find the list item (LI) ancestor
      while($option.prop("tagName") !== "LI") {
        $option = $option.parent();

        if(!$option || $option.length === 0 || $option.prop("tagName") == "BODY") {
          break;
        }
      }

      // If we actually found a list item
      if($option.prop("tagName") == "LI") {
        idx = $option.attr('choice-id');
        this.setSelectedIndex(idx);
        this.open = false;
      }
    },
    setSelectedIndex: function(idx) {
      var choice = this.choices[idx];

      if (this._isMenu) {

        if (this._onSelectEvent) {
          this._onSelectEvent({
            index: idx,
            choice: choice,
            value: choice.display,
            dropdown: this
          });
        }

      } else {
        this._selectedIndex = idx;
        this._value = this.choices[idx];
        this.$display.text(choice.display);
        this.$choices.attr('selected', false);
        $(this.$choices[idx]).attr('selected', true);
      }
    },
    setListZIndex: function() {
      // Get the origin z-index
      var originZ = this.$list.css('z-index');

      // Set the z-index to 100 over
      if(originZ) {
        this.$list.css('z-index', parseInt(originZ) + DROPDOWN_ZINDEX_SHIFT);
      } else {
        this.$list.css('z-index', DROPDOWN_DEFAULT_ZINDEX);
      }
    },
    layoutDropdown: function() {
      if (!this.$list) {
        this.setupListDOM();
        this.bindListEvents();
      }

      if (this._mobileStyle === "panel") {
        this.$el.addClass('cx-mobile-panel');
      } else {
        this.$el.removeClass('cx-mobile-panel');
      }
    },
    getOverflowContainer: function() {
      var ancestor = this.$el.parent(),
        foundOverflowContainer = false;

      while (ancestor[0] !== document.body) {
        var parent = ancestor.parent();

        if (ancestor.css('overflow') !== 'visible') {
          foundOverflowContainer = true;
          break;

        } else if (parent && parent.length > 0) {
          ancestor = parent;
        } else {
          break;
        }

      }

      if (!foundOverflowContainer) {
        ancestor = $(window);
      }

      return ancestor;
    },
    positionDropdown: function() {
      // positions: below, over, aligned
      var baseHeight = this.$display.outerHeight(),
        baseOffset = this.$el.offset(),
        listOffset = this.$list.offset(),
        listItemHeight = $(this.$choices[0]).outerHeight(),
        top, left;

      var $overflowContainer = this.getOverflowContainer();

      var containerWidth = $overflowContainer.width(),
        containerHeight = $overflowContainer.height();

      switch (this._position) {
        case "below":
          top = baseOffset.top + baseHeight;
          break;
        case "over":
          top = baseOffset.top;
          break;
        case "aligned":
          top = baseOffset.top - (this._selectedIndex * listItemHeight);
          break;
      }

      left = baseOffset.left - this.getLeftAdjustment( baseOffset, $overflowContainer);
      top  = top - this.getTopAdjustment( baseOffset, $overflowContainer);

      this.$list.css('position', 'fixed');
      this.$list.css('left', left);
      this.$list.css('top', top);
    },
    getLeftAdjustment: function( baseOffset, $overflowContainer) {
      var listWidth       = this.$list.width();

      var containerWidth  = $overflowContainer.outerWidth(),
          containerHeight = $overflowContainer.outerHeight();

      var containerLeft   = $overflowContainer.offset() ? $overflowContainer.offset().left : 0;
      var containerExtent = containerLeft + containerWidth;


      var horizontalExtent = baseOffset.left + listWidth;
      var leftAdjustment = 0;
      if (horizontalExtent > containerExtent) {
        leftAdjustment = (horizontalExtent - containerExtent) + 10;
      }
      return leftAdjustment;
    },
    getTopAdjustment: function( baseOffset, $overflowContainer) {
      var listHeight       = this.$list.height();

      var containerWidth  = $overflowContainer.outerWidth(),
          containerHeight = $overflowContainer.outerHeight();

      var containerTop   = $overflowContainer.offset() ? $overflowContainer.offset().top : 0;
      var containerExtent = containerTop + containerHeight;


      var verticalExtent = baseOffset.top + listHeight;
      var topAdjustment = 0;
      if (verticalExtent > containerExtent) {
        topAdjustment = (verticalExtent - containerExtent) + 10;
      }
      return topAdjustment;
    },
    remove: function() {
      this.unbindBaseEvents();
      this.unbindListEvents();

      if(this.$list) {
        this.$list.empty();
        this.$list.remove();
      }


      this.$el = null;
      this.$display = null;
      this.$list = null;
      this.$choices = null;

      this.choices = [];
    },
    get value() {
      return this._value;
    },
    set value(val) {
      var idx = null;

      if (_.isNumber(val)) {
        idx = val;
      } else {
        idx = _.findIndex(this.choices.indexOf, 'key', val);
      }

      if (idx && idx > -1) {
        this.setSelectedIndex(idx);
      }
    },
    set open(val) {
      if(this.$el) {
        this.$el.attr('open', val);
      }
      this._open = val;
      if (val) {
        this.$el.trigger('focus');

        this.layoutDropdown();          // Build the dropdown list
        this.$list.attr('open', val);   // Set the list to open in the DOM
        this.positionDropdown();        // Position the dropdown now that layout is correct
        this.setListZIndex();

        this.setHighlightedItem(this._selectedIndex);
      } else {
        this.$list.attr('open', val);
        if (this._selfDestruct) {
          this.remove();
        }
      }
    },
    get open() {
      return this._open;
    }
  };

  Dropdown.initAll = function() {
    var elements = $('[cx-dropdown]');
    _.each(elements, function(el) {
      var dropdown = new Dropdown(el);
    });
  };

  exports.Dropdown = Dropdown;

  $(document).ready(function() {
    Dropdown.initAll();
  });

})(window);
