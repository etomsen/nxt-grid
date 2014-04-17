nxt-grid
========

AngularJS directive with thumbnails grid and floating preview

example of the grid can be seen here:
http://filmr-deploy.herokuapp.com/#/home/allmovies

check the directive usage example (home.html and grid.css files)

grid requires in HTML:

1. nxt-grid__preview-position element
  used to absoutely position the preview element
2. grid__preview element
  used for sizing the preview element
3. nxt-grid directive element MUST have an id. For example "home-nxt-grid". It's used to identify the elements within the grid
4. grid items are identified by ids: home-nxt-grid-item-{{index}} as in example. the id is composed of grid id + "-item-{{index}}" string 
