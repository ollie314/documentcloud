$(function() {

  window.HomePage = Backbone.View.extend({

    BLOG_HEADLINES_URL : '//blog.documentcloud.org/?json=get_recent_posts&count=7&callback=?',

    el : document.body,

    events : {
      'keydown #search_box':   'maybeSearch',
      'search #search_box':    'search',
      'focus #search_box':     'addFocus',
      'blur #search_box':      'removeFocus',
      'click .cancel_search':  'cancelSearch',
      'click #login_button':   'login'
    },

    initialize : function() {
      dc.ui.notifier      = new dc.ui.Notifier();
      this.box            = $('#search_box');
      this.emailInput     = $('#account_email');
      this.passwordInput  = $('#account_password');
      _.invoke([this.box, this.emailInput, this.passwordInput], 'placeholder');
      $(_.bind(this.loadBlogHeadlines, this));
    },

    login : function() {
      $('#login_form').submit();
    },

    search : function() {
      var query = this.box.val();
      if (query) window.location = (window.serverRoot || '') + '/public/search/' + encodeURIComponent(query);
    },

    cancelSearch : function() {
      this.box.val('');
    },

    maybeSearch : function(e) {
      if (e.which == 13) this.search();
    },

    addFocus : function() {
      $('#search_box_wrapper').addClass('focus');
    },

    removeFocus : function() {
      $('#search_box_wrapper').removeClass('focus');
    },

    loadBlogHeadlines : function() {
      var formatDate = DateUtils.create("%b %e, %Y");
      $.getJSON(this.BLOG_HEADLINES_URL, function(json) {
        var posts = json.posts;
        if (posts.length > 0) {
          var headlines_html = "";
          _.each(posts, function(post, i) {
            headlines_html += JST['home/blog_headline'](_.extend(post, {
              date : formatDate(DateUtils.parseRfc(post.date)),
            }));
          });
          $('#news_headlines').html(headlines_html);
        } else {
          $('#news').hide();
        }
      });
    }

  });

  window.homepage = new HomePage();

});