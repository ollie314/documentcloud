// Responsible for rendering a list of DocumentTiles. The tiles can be displayed
// in a number of different sizes.
dc.ui.DocumentList = dc.View.extend({

  className : 'document_list large_size',

  callbacks : {
    '.view_small.click':  'viewSmall',
    '.view_medium.click': 'viewMedium',
    '.view_large.click':  'viewLarge'
  },

  constructor : function(options) {
    this.base(options);
    _.bindAll(this, 'refresh', '_removeDocument');
    Documents.bind(dc.Set.REFRESHED,     this.refresh);
    Documents.bind(dc.Set.MODEL_REMOVED, this._removeDocument);
  },

  render : function() {
    $(this.el).html(JST.document_list({}));
    this.docContainer = $('.documents', this.el);
    this.setCallbacks();
    return this;
  },

  refresh : function() {
    var container = this.docContainer;
    Documents.each(function(doc) {
      container.append((new dc.ui.DocumentTile(doc)).render().el);
    });
  },

  _removeDocument : function(e, doc) {
    $('#document_tile_' + doc.id).remove();
  },

  viewSmall : function() {
    this.setMode('small', 'size');
  },

  viewMedium : function() {
    this.setMode('medium', 'size');
  },

  viewLarge : function() {
    this.setMode('large', 'size');
  }

});