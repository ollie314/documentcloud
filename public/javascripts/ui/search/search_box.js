// The search controller is responsible for managing document/metadata search.
dc.ui.SearchBox = Backbone.View.extend({

  // Error messages to display when your search returns no results.
  NO_RESULTS : {
    project   : "This project does not contain any documents.",
    account   : "This account does not have any documents.",
    group     : "This organization does not have any documents.",
    related   : "There are no documents related to this document.",
    published : "This account does not have any published documents.",
    annotated : "There are no annotated documents.",
    search    : "Your search did not match any documents.",
    all       : "There are no documents."
  },

  id  : 'search',
  
  PREFIXES : ['project', 'text', 'account', 'document', 'filter', 
              'group', 'access', 'related', 'projectid'],

  events : {
    'keypress #search_box'      : 'maybeSearch',
    // 'search #search_box'        : 'searchEvent',
    'focus #search_box'         : 'addFocus',
    'blur #search_box'          : 'removeFocus',
    'click .cancel_search_box'  : 'cancelSearch',
    'click #search_box_wrapper' : 'focusSearch',
    'click #search_button'      : 'searchEvent'
  },

  // Creating a new SearchBox registers #search page fragments.
  constructor : function(options) {
    Backbone.View.call(this, options);
    _.bindAll(this, 'hideSearch', 'renderFacets');
    SearchQuery.bind('refresh', this.renderFacets);
  },

  render : function() {
    $(this.el).append(JST['workspace/search_box']({}));
    this.box      = this.$('#search_box');
    this.titleBox = this.$('#title_box_inner');
    $(document.body).setMode('no', 'search');
    this.box.autocomplete(this.PREFIXES, {
      width     : 100,
      minChars  : 1
    }).result(_.bind(function(e, data, formatted) {
      e.preventDefault();
      this.addFacet(formatted);
      return false;
    }, this));
    
    // This is defered so it can be attached to the DOM to get the correct font-size.
    _.defer(_.bind(function() {
      this.box.autoGrowInput();
    }, this));
    
    this.createFacetCategoryMenu();
    
    return this;
  },
  
  createFacetCategoryMenu : function() {
    var items = [
      {title: 'Account', onClick: _.bind(this.addFacet, this, 'account', '')},
      {title: 'Project', onClick: _.bind(this.addFacet, this, 'project', '')},
      {title: 'Filter', onClick: _.bind(this.addFacet, this, 'filter', '')},
      {title: 'Access', onClick: _.bind(this.addFacet, this, 'access', '')}
    ];
    
    var menu = new dc.ui.Menu({
      label   : 'Everything',
      items   : items
    });
    
    this.$('#search_category_selector').append(menu.render().el);
  },
  
  // Shortcut to the searchbox's value.
  value : function(query) {
    if (query == null) return this.getQuery();
    return this.setQuery(query);
  },
  
  getQuery : function() {
    var query = SearchQuery.map(function(facet) {
      return facet.serialize();
    }).join(' ');

    query += ' ' + this.box.val();
    
    return query;
  },
  
  queryWithoutCategory : function(category) {
    var query = SearchQuery.map(function(facet) {
      if (facet.get('category') != category) return facet.serialize();
    }).join(' ');

    query += ' ' + this.box.val();
    
    return query;
  },
  
  removeFacet : function(view) {
    this.facetViews = _.without(this.facetViews, view);
  },
  
  setQuery : function(query) {
    dc.app.SearchParser.parse(query);
    this.box.val('');
  },

  hideSearch : function() {
    $(document.body).setMode(null, 'search');
  },

  showDocuments : function() {
    $(document.body).setMode('active', 'search');
    var query = this.value();
    var title = dc.model.DocumentSet.entitle(query);
    this.titleBox.html(title);
    var projectName = SearchQuery.find('project');
    var groupName = SearchQuery.find('group');
    dc.app.organizer.highlight(projectName, groupName);
  },

  startSearch : function() {
    dc.ui.spinner.show();
    dc.app.paginator.hide();
    _.defer(dc.app.toolbar.checkFloat);
  },

  cancelSearch : function() {
    this.value('');
  },

  // Callback fired on key press in the search box. We search when they hit
  // return.
  maybeSearch : function(e) {
    console.log(['box key', e.keyCode, dc.app.hotkeys.key(e)]);
    if (!dc.app.searcher.flags.outstandingSearch && dc.app.hotkeys.key(e) == 'enter') {
      return this.searchEvent(e);
    }

    if (dc.app.hotkeys.colon(e)) {
      this.addFacet(this.box.val());
      return false;
    }
    if (dc.app.hotkeys.shift && e.keyCode == 9) { // Tab key
      e.preventDefault();
      this.focusNextFacet(this.facetViews.length-1, 0);
    } else if (e.keyCode == 9) {
      e.preventDefault();
      this.focusNextFacet(null, 0);
    }
  },

  // Webkit knows how to fire a real "search" event.
  searchEvent : function(e) {
    var query = this.value();
    console.log(['real searchEvent', e, query]);
    if (!dc.app.searcher.flags.outstandingSearch) dc.app.searcher.search(query);
  },
    
  addFacet : function(category, initialQuery) {
    this.box.val('');
    var model = new dc.model.SearchFacet({
      category : category,
      value    : initialQuery
    });
    SearchQuery.add(model);
    var view = this.renderFacet(model);
    dc.app.searcher.flags.outstandingSearch = true;
    _.defer(function() {
      view.enableEdit();
      dc.app.searcher.flags.outstandingSearch = false;
    }, 100);
  },

  // Renders each facet as a searchFacet view.
  renderFacets : function() {
    this.$('.search_facets').empty();
    this.facetViews = [];
    SearchQuery.each(_.bind(function(facet) {
      if (facet.get('category') == 'entities') {
        console.log(['entities', facet]);
      } else {
        this.renderFacet(facet);
      }
    }, this));
  },
  
  // Render a single facet, using its category and query value.
  renderFacet : function(facet) {
    var view = new dc.ui.SearchFacet({
      model : facet
    });
    
    this.facetViews.push(view);
    this.$('.search_facets').append(view.render().el);

    return view;
  },
    
  // Hide the spinner and remove the search lock when finished searching.
  doneSearching : function() {
    var count      = dc.app.paginator.query.total;
    var documents  = dc.inflector.pluralize('Document', count);
    var searchType = SearchQuery.searchType();
    
    if (dc.app.searcher.flags.related) {
      this.titleBox.text(count + ' ' + documents + ' Related to "' + dc.inflector.truncate(dc.app.searcher.relatedDoc.get('title'), 100) + '"');
    } else if (dc.app.searcher.flags.specific) {
      this.titleBox.text(count + ' ' + documents);
    } else if (searchType == 'search') {
      var quote  = SearchQuery.has('project');
      var suffix = ' in ' + (quote ? '“' : '') + this.titleBox.html() + (quote ? '”' : '');
      var prefix = count ? count + ' ' + dc.inflector.pluralize('Result', count) : 'No Results';
      this.titleBox.html(prefix + suffix);
    }
    if (count <= 0) {
      $(document.body).setMode('empty', 'search');
      var explanation = this.NO_RESULTS[searchType] || this.NO_RESULTS['search'];
      $('#no_results .explanation').text(explanation);
    }
    dc.ui.spinner.hide();
    dc.app.scroller.checkLater();
  },
  
  focusNextFacet : function(currentView, direction) {
    console.log(['focusNextFacet', currentView, direction]);
    var currentFacetIndex = 0;
    var viewsCount = this.facetViews.length;
    
    _.each(this.facetViews, function(facetView, i) {
      if (currentView == facetView || currentView == i) {
        currentFacetIndex = i;
      }
    });
    
    var next = currentFacetIndex + direction;
    if (next < 0 || viewsCount-1 < next) {
      // this.facetViews[currentFacetIndex].disableEdit();
      this.box.focus();
    } else {
      this.facetViews[next].enableEdit();
    }
  },
  
  focusCategory : function(category) {
    _.each(this.facetViews, function(facetView) {
      if (facetView.options.category == category) {
        facetView.enableEdit();
      }
    });
  },

  blur : function() {
    this.box.blur();
  },

  focusSearch : function(e) {
    if ($(e.target).is('#search_box_wrapper') || $(e.target).is('.search_inner')) {
      this.box.focus();
    }
  },
  
  addFocus : function() {
    Documents.deselectAll();
    this.$('.search').addClass('focus');
  },

  removeFocus : function() {
    this.$('.search').removeClass('focus');
  }

});