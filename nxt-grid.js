'use strict';

angular.module('nextrailerApp')
.directive('nxtGrid', ['$log', '$q', function ($log, $q) {

    var obj = {initialized: false};

    var toPixels = function(value) {
        var result;
        if (typeof value === 'string' || value instanceof String) {
            var ext = value.slice(-2);
            if (ext === 'px') {
                result = parseFloat(value);
            } else
            if (ext === 'vw') {
                result = parseFloat(value) * $(window).width() / 100;
            } else
            if (ext === 'vh') {
                result = parseFloat(value) * $(window).height() / 100;
            } else {
                $log.error('nxtGrid.toPixels('+value+'): '+ ext + ' measurement is not supported!')
                return undefined;
            }
        } else {
            $log.error('nxtGrid.toPixels(): '+ value + ' is not a string!')
            return undefined;
        }
        return result;
    }

    var doAnimate = function(animation, time) {
        var deferred = $q.defer();
        var animationFinished = {};
        var onAnimationFinish = function(param) {
            animationFinished[param] = true;
            var res = true;
            var names = Object.getOwnPropertyNames(animation);
            for (var i = 0; i < names.length; i++) {
                res = animationFinished[names[i]] ? true : false;
                if (!res) {
                    break;
                }
            }
            if (res === true) {
                // update model params that changed after the animation
                recalculateModel();
                // this returns a promise success only when all animations are finished
                deferred.resolve(0);
            }
        }
        if (obj.grid && animation.gridScroll !== undefined) {
            obj.grid.animate({scrollTop: Math.round(animation.gridScroll)}, time, function(){onAnimationFinish('gridScroll');});
        }
        if (obj.previewPosition && animation.previewTop !== undefined) {
            obj.previewPosition.animate({'top': Math.round(animation.previewTop)+'px'}, time, function(){onAnimationFinish('previewTop');});
        }
        if (obj.newItem && animation.newItemHeight !== undefined) {
            obj.newItemHeight = animation.newItemHeight;
            obj.newItem.animate({'height': Math.round(animation.newItemHeight)+'px'}, time, function(){onAnimationFinish('newItemHeight');});
        }
        if (obj.oldItem && animation.oldItemHeight !== undefined) {
            obj.oldItemHeight = animation.oldItemHeight;
            obj.oldItem.animate({'height': Math.round(animation.oldItemHeight)+'px'}, time, function(){onAnimationFinish('oldItemHeight');});
        }
        if (obj.preview && animation.previewHeight !== undefined) {
            obj.previewHeight = animation.previewHeight;
            obj.preview.animate({'height': Math.round(animation.previewHeight)+'px'}, time, function(){onAnimationFinish('previewHeight');});
        }
        return deferred.promise;
    }

    var itemsAtSameRow = function() {
        if (obj.newItem === undefined || obj.oldItem === undefined) {
            return false;
        }
        return obj.newItem.position().top === obj.oldItem.position().top ? true : false;
    }

    var recalculateModel = function() {
        obj.gridScroll = obj.grid.scrollTop();
        obj.previewPositionTop = obj.previewPosition !== undefined ? toPixels(obj.previewPosition.css('top')) : 0;
        obj.previewHeight = obj.preview !== undefined ? toPixels(obj.preview.css('height')) : 0;
        obj.newItemHeight = obj.newItem !== undefined ? toPixels(obj.newItem.css('height')) : 0;
        obj.oldItemHeight = obj.oldItem !== undefined ? toPixels(obj.oldItem.css('height')) : 0;
    }

    var initModel = function(scope, element, newVal, oldVal) {
        obj.scope = scope;
        obj.heightRate = parseFloat(scope.heightRate);
        obj.heightRate = obj.heightRate ? obj.heightRate : 0.7 * 9 / 16;
        obj.grid = obj.grid ? obj.grid : element;
        obj.newItemIndex = newVal.index;
        obj.oldItemIndex = oldVal.index;
        obj.gridHeight = element.height();

        if (!obj.previewPosition) {
            var previewPosition = element.find(".nxt-grid__preview-position");
            if (previewPosition) {
                obj.previewPosition = previewPosition;
            }
        }

        if (!obj.preview) {
            var preview = $(previewPosition).find('.nxt-grid__preview');
            if (preview) {
                obj.preview = preview;
            }
        }


        var newItem = (newVal.index !== undefined) ? element.find("#"+obj.grid[0].id + '-item-' + newVal.index) : undefined;
        if (newItem) {
            obj.newItem = newItem;
            obj.newItemMinHeight = toPixels(obj.newItem.css('min-height'));
            obj.newItemMaxHeight = obj.newItemMinHeight + obj.preview.width() * obj.heightRate;
            obj.previewTopShift = (obj.gridHeight - obj.newItemMaxHeight + obj.newItemMinHeight)/2;
        }


        var oldItem = (oldVal.index !== undefined) ? element.find("#"+obj.grid[0].id + '-item-' + oldVal.index) : undefined;
        if (oldItem) {
            obj.oldItem = oldItem;
            obj.oldItemMinHeight = toPixels(obj.oldItem.css('min-height'));
            obj.oldItemMaxHeight = obj.oldItemMinHeight +  obj.preview.width() * obj.heightRate;
            obj.previewTopShift = (obj.gridHeight - obj.oldItemMaxHeight + obj.oldItemMinHeight)/2;
        }
        recalculateModel();
        obj.initialized = true;
    };

    var shiftUp_closeOld = function() {
        var distance = Math.min(obj.previewPositionTop - (getNewItemAbsoluteTop() + obj.newItemHeight), obj.oldItemHeight - obj.oldItemMinHeight);
        var params = {
            'oldItemHeight': obj.oldItemHeight - distance,
            'previewTop': obj.previewPositionTop - distance,
            'gridScroll': obj.gridScroll - distance
        };
        var speed = 1000; // px/s
        var time = Math.round(distance / speed * 1000) ;
        return doAnimate(params, time);
    };


    var shiftDown_scrollToNewPreservePreviewPos = function() {
        var params = {};
        params.gridScroll = obj.gridScroll + obj.newItemMinHeight;
        params.previewTop = getNewItemAbsoluteTop() + obj.newItemMinHeight;
        var newItemNewBottom = getNewItemAbsoluteTop() + obj.newItemHeight;
        var previewNewBottom = params.previewTop + obj.previewHeight;
        if (previewNewBottom > newItemNewBottom) {
            params.newItemHeight = obj.newItemHeight + (previewNewBottom - newItemNewBottom);
        }
        var speed = 1000; // px/s
        var time = Math.round(obj.newItemMinHeight / speed * 1000) ;
        return doAnimate(params, time);
    };

    var openPreview_expandActive = function() {
        var distance = obj.newItemMaxHeight - obj.newItemHeight;
        var speed = 1000; // px/s
        var time = Math.round(distance / speed * 1000) ;
        var params = {'newItemHeight': obj.newItemMaxHeight, 'previewHeight': obj.newItemMaxHeight - obj.newItemMinHeight};
        return doAnimate(params, time);
    };

    var getNewItemAbsoluteTop = function() {
        return obj.grid.scrollTop() + obj.newItem.position().top;
    }

    var getOldItemAbsoluteTop = function() {
        return obj.grid.scrollTop() + obj.oldItem.position().top;
    }

    var closePreview_collapseActive = function() {
        var distance = obj.newItemHeight - obj.newItemMinHeight;
        var speed = 1000; // px/s
        var time = Math.round(distance / speed * 1000) ;
        var params = {'newItemHeight': obj.newItemMinHeight, 'previewHeight': 0};
        return doAnimate(params, time);
    };

    var switchActiveInSameRow = function() {
        if (!itemsAtSameRow()) {
            $log.warn('nxt-grid.switchActiveInSameRow: new and elemenst should be in the same row!');
        }
        doAnimate({'newItemHeight': obj.newItemMaxHeight}, 0);
        return doAnimate({'oldItemHeight': obj.oldItemMinHeight}, 0);
    }

    var getNewPreviewPosition = function() {
        return getNewItemAbsoluteTop() + obj.newItemMinHeight;
    }

    var openPreview_moveToPos = function() {
        var previewTop = getNewItemAbsoluteTop() + obj.newItemMinHeight;
        var gridScroll = previewTop - obj.previewTopShift;
        var distance = gridScroll > obj.gridScroll ? gridScroll - obj.gridScroll : obj.gridScroll - gridScroll;
        var speed = 1000; // px/s
        var time = Math.round(distance / speed * 1000) ;
        return doAnimate({'previewTop': gridScroll + obj.previewTopShift, 'gridScroll': gridScroll}, time);
    }

    var openPreview = function() {
        openPreview_moveToPos()
        .then(openPreview_expandActive)
        .then(obj.scope.onAnimationFinish);
    };

    var closePreview = function() {
        closePreview_collapseActive()
        .then(obj.scope.onAnimationFinish);
    };

    var shiftDown_closeOld = function() {
        var params = {};
        params.oldItemHeight = obj.oldItemMinHeight;

        var previewTop = obj.previewPositionTop;
        var previewBottom = previewTop + obj.previewHeight;

        var newItemTop = getNewItemAbsoluteTop() - (obj.oldItemHeight - obj.oldItemMinHeight);
        var newItemBottom = newItemTop + obj.newItemMinHeight;

        if (newItemBottom < previewBottom) {
            params.newItemHeight = obj.newItemMinHeight + (previewBottom - newItemBottom);
        }

        var distance = obj.oldItemHeight - obj.oldItemMinHeight;
        var speed = 1000; // px/s
        var time = Math.round(distance / speed * 1000) ;
        return doAnimate(params, time);
    }

    var shiftUp_scrollToNew = function() {
        var distance = obj.previewPositionTop - (getNewItemAbsoluteTop() + obj.newItemHeight);
        // TODO: diatance shuld be >= 0
        var params = {'previewTop': obj.previewPositionTop - distance, 'gridScroll': obj.gridScroll - distance};
        var speed = 1000; // px/s
        var time = Math.round(distance / speed * 1000) ;
        return doAnimate(params, time);
    }

    var shiftUp_expandNew = function() {
        var distance = (obj.previewPositionTop + obj.previewHeight) - (getNewItemAbsoluteTop() + obj.newItemHeight);
        // TODO: diatance shuld be >= 0
        var params = {'newItemHeight': obj.newItemHeight + distance};
        var speed = 1000; // px/s
        var time = Math.round(distance / speed * 1000) ;
        return doAnimate(params, time);
    }

    var shiftDown = function() {
        if (itemsAtSameRow())  {
            switchActiveInSameRow();
            obj.scope.onAnimationFinish();
        } else {
            shiftDown_closeOld()
            .then(shiftDown_scrollToNewPreservePreviewPos)
            .then(openPreview_moveToPos)
            .then(obj.scope.onAnimationFinish);
        }
    };


    var shiftUp = function() {
        if (itemsAtSameRow())  {
            switchActiveInSameRow();
            obj.scope.onAnimationFinish();
        } else {
            shiftUp_closeOld()
            .then(shiftUp_scrollToNew)
            .then(shiftUp_expandNew)
            .then(openPreview_moveToPos)
            .then(obj.scope.onAnimationFinish);
        }
    };

    var onAttributesChange = function(newVal, oldVal) {
        if (!obj.initialized) {
            return null;
        }
        if (newVal.index === undefined && oldVal.index !== undefined) {
            return closePreview;
        }
        if ((newVal.index !== undefined || oldVal.index !== undefined) && (newVal.index === oldVal.index || oldVal.index === undefined)) {
            return newVal.preview ? openPreview : closePreview;
        }
        if (newVal.index > oldVal.index) {
            return oldVal.preview ? shiftDown : openPreview;
        }
        if (newVal.index < oldVal.index) {
            return oldVal.preview ? shiftUp : openPreview;
        }
        return null;
    };

    return {
        restrict: 'A',
        scope: {
            activeItem: '=',
            onViewportChange: '&',
            onAnimationFinish: '&',
            heightRate: '='
        },
        link: function postLink(scope, element, attrs) {
            $(element).scroll(function() {
                scope.onViewportChange();
            });
            scope.$watch('activeItem', function (newVal, oldVal, scope){
                var method = onAttributesChange(newVal, oldVal);
                initModel(scope, element, newVal, oldVal);
                return method ? method() : $log.warn('nxtGrid.$watch: no method found!');
            }, true);
        }
    };
}]);
