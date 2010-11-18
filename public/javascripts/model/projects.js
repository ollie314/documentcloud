// Project Model

dc.model.Project = Backbone.Model.extend({

  constructor : function(attrs, options) {
    var collabs = attrs.collaborators || [];
    delete attrs.collaborators;
    Backbone.Model.call(this, attrs, options);
    this.collaborators = new dc.model.AccountSet(collabs);
    this._setCollaboratorsResource();
  },

  set : function(attrs, options) {
    attrs || (attrs = {});
    if (attrs.title)            attrs.title = Inflector.trim(attrs.title).replace(/"/g, '');
    if (attrs.document_ids)     attrs.document_count = attrs.document_ids.length;
    if (attrs.account_id)       attrs.owner = attrs.account_id == dc.account.id;
    Backbone.Model.prototype.set.call(this, attrs, options);
    if (attrs.id) this._setCollaboratorsResource();
    return this;
  },

  // Generate the canonical slug for this Project. Usable by API calls.
  slug : function() {
    return this.id + '-' + Inflector.sluggify(this.get('title'));
  },

  open : function() {
    dc.app.searcher.search(this.toSearchParam());
  },

  documentCount : function() {
    return this.get('document_ids').length;
  },

  addDocuments : function(documents) {
    var ids = _.pluck(documents, 'id');
    var newIds = _.uniq(this.get('document_ids').concat(ids));
    this.save({document_ids : newIds});
  },

  removeDocuments : function(documents, localOnly) {
    var args = _.pluck(documents, 'id');
    args.unshift(this.get('document_ids'));
    var newIds = _.without.apply(_, args);
    if (localOnly) {
      this.set({document_ids : newIds});
    } else {
      this.save({document_ids : newIds});
    }
  },

  // Does this project already contain a given document?
  contains : function(doc) {
    return _.indexOf(this.get('document_ids'), doc.id) >= 0;
  },

  // Does this project already contain any of the given documents?
  containsAny : function(docs) {
    var me = this;
    return _.any(docs, function(doc){ return me.contains(doc); });
  },

  // Return the title of this project as a search parameter.
  toSearchParam : function() {
    var titlePart = this.get('title');
    if (titlePart.match(/\s/)) titlePart = '"' + titlePart + '"';
    return 'project: ' + titlePart;
  },

  statistics : function() {
    var docCount    = this.get('document_count');
    var noteCount   = this.get('annotation_count');
    var shareCount  = this.collaborators.length;
    return docCount + ' ' + Inflector.pluralize('document', docCount)
      + ', ' + noteCount + ' ' + Inflector.pluralize('note', noteCount)
      + (shareCount ? ', ' + shareCount + ' ' + Inflector.pluralize('collaborator', shareCount) : '');
  },

  _setCollaboratorsResource : function() {
    if (!(this.collaborators && this.id)) return;
    this.collaborators.url = 'projects/' + this.id + '/collaborators';
  }

});

dc.model.Project.topLevelTitle = function(type) {
  switch (type) {
    case 'all_documents':       return 'All Documents';
    case 'your_documents':      return 'Your Documents';
    case 'published_documents': return 'Your Published Documents';
    case 'org_documents':       return Inflector.possessivize(dc.account.organization.name) + " Documents";
  }
};

// Project Set
dc.model.ProjectSet = Backbone.Collection.extend({

  model : dc.model.Project,

  url   : '/projects',

  comparator : function(m) {
    return m.get('title').toLowerCase();
  },

  // Find a project by title.
  find : function(title) {
    return this.detect(function(m){ return m.get('title').toLowerCase() == title.toLowerCase(); });
  },

  // Find all projects starting with a given prefix, for autocompletion.
  startingWith : function(prefix) {
    var matcher = new RegExp('^' + prefix);
    return this.select(function(m){ return !!m.get('title').match(matcher); });
  },

  // Increment the document_count attribute of a given project, by id.
  incrementCountById : function(id) {
    var project = this.get(id);
    project.set({document_count : project.get('document_count') + 1});
  },

  // When documents are deleted, remove all of their matches.
  removeDocuments : function(docs) {
    this.each(function(project) { project.removeDocuments(docs, true); });
  },

  isDocumentShared : function(resource) {
    var id = resource.get('document_id') || resource.id;
    var doc = Documents.get(id);
    var projects = this.models;
    for (var i = 0, l = projects.length; i < l; i++) {
      var project = projects[i];
      if (_.include(project.get('document_ids'), id)) {
        for (var j = 0, k = project.collaborators.length; j < k; j++) {
          var collab = project.collaborators[j];
          if (collab.ownsOrCollaborates(doc)) return true;
        }
      }
    }
    return false;
  }

});

_.extend(dc.model.ProjectSet.prototype, dc.model.Selectable);

window.Projects = new dc.model.ProjectSet();
