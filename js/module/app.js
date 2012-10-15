__AVS = [
    {
        start_date: new Date(2012, 09, 10),
        end_date: new Date(2012, 09, 15),
        av_status: 'blocked'
    },
    {
        start_date: new Date(2012, 09, 15),
        end_date: new Date(2012, 09, 22),
        av_status: 'open'
    }
];


$(function(){
    console.log('hello world')

    var Availability = Backbone.Model.extend({
        initialize: function() {
            _.bindAll(this, 'renderDay');
        },

        renderDay: function(date){
            var day = $('<li />');
            var holder = $('<a />');
            day.addClass('day').addClass(this.get('av_status')).data('date', date.getTime());
            day.html(date.getDate() + '/' + date.getMonth() + '<br />' + this.cid);
            return day
        },

        updateEnd: function(date){
            var old_end = new Date(this.get('end_date').getTime());
            // first update this end
            this.set({end_date: new Date(date)}, {silent: true});

            if(this.get('end_date') > old_end) {
                // then check each date between old and new, and update any start dates if we need to
                while (old_end < this.get('end_date')) {
                    found_av = this.collection.byDate('start', old_end);
                    if (typeof found_av !== 'undefined') {
                        found_av.updateStart(new Date(this.get('end_date').getTime()));
                    }
                    old_end.setDate(old_end.getDate() + 1)
                }
            } else {
                // we're going backwards so grab the av that started on the old end date and change that
                found_av = this.collection.byDate('start', old_end);
                found_av.updateStart(new Date(this.get('end_date').getTime()));
            }
        },

        updateStart: function(date) {
            var new_start = new Date(date);

            if (new_start > this.get('end_date')) {
                this.destroy();
            } else {
                this.set('start_date', new_start);
            }
        },

        destroy: function() {
            var cid = this.cid;
            // remove any handles for this av.
            $('.handle').filter(function(el) { return $(this).data('availability').cid == cid}).remove();
        }
    });

    var Availabilities = Backbone.Collection.extend({
        model: Availability,

        initialize: function(){
            this.calendarView = new CalendarView({collection: this})
            this.bind("change", this.updateDays);
            return this
        },

        byDate: function(type, date) {
            av = this.filter(function(av) {
                return av.get(type + '_date').getTime() == date.getTime();
            })
            if (av.length) {
                return av[0]
            }
        },

        show: function(){
            this.calendarView.renderDays().renderHandles()
        },

        updateDays: function(){
            this.calendarView.renderDays()
        },
    });

    
    var CalendarView = Backbone.View.extend({
    
        initialize: function(){
            this.el = '#host_access_calendar';
            _.bindAll(this, 'render');
        },

        renderDays: function(){
            console.log('--- rendering ---');
            var current_date = new Date(2012, 09);
            var end_date = new Date(2012, 10);
            var cal = $('<ul />');
            var current_av;
            var found_av;
            
            while (current_date <= end_date) {
                found_av = this.collection.byDate('start', current_date);
                if (typeof found_av !== 'undefined') {
                    // then we have an availability object that starts on this day, so don't need to check constantly
                    // if we currently have an unknown av then we need to make sure we set the end date correctly
                    if (typeof current_av !== 'undefined' && current_av.get('av_status') === 'unknown') {
                        current_av.set({'end_date': new Date(current_date.getTime())}, {silent: true});
                    }
                    current_av = found_av;
                    while (current_date < current_av.get('end_date')){
                        cal.append(current_av.renderDay(current_date));
                        current_date.setDate(current_date.getDate() + 1);
                    }
                } else {
                    // we don't know the av for that day
                    if (typeof current_av !== 'undefined' && current_av.get('av_status') === 'unknown') {
                        // extend the current unknow availability object
                        current_av.set({'end_date': new Date(current_date.getTime())}, {silent: true});
                    } else {
                        // we need to make a new unknown av object
                        current_av = new Availability({
                            start_date: new Date(current_date.getTime()),
                            end_date: new Date(current_date.getTime()),
                            av_status: 'unknown'
                        })
                        this.collection.add(current_av)
                    }
                    cal.append(current_av.renderDay(current_date));
                    current_date.setDate(current_date.getDate() + 1)
                }
            }
            $(this.el).html(cal)

            $('.day').droppable({
                accept: '.handle',
                over: function(event, ui) {
                    //console.log($(this).data('date'));
                },
                drop: function(event, ui) {
                    var av = ui.draggable.data('availability');
                    av.updateEnd($(this).data('date'));
                }
            });

            return this;
        },

        renderHandles: function() {
            _.each(this.collection.models, function(av){
                var offset = $('.day').filter(function(el) { return $(this).data('date') == av.get('end_date').getTime()}).offset()
                offset.top += 35;
                offset.left -= 5;
                var handle = $('<a />').addClass('handle').data('availability', av).offset(offset);
                $(this.el).after(handle);
            }, this)

            $('.handle').draggable({
                grid: [102, 102],
            });

        }
    });

    var availabilities = new Availabilities(__AVS).show()

})
