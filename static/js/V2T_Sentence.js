'use strict'; /* globals V2T */
(function () {
    class Sentence extends V2T.Base {

        constructor(list_of_parts) {
            super();
            this.parts = list_of_parts;
            this.text_parent = $('#textParent');

            //from http://jsfiddle.net/ghaq69b3/
            this.text_parent.selectable({
                cancel: '.sort-handle'
            }).sortable({
                items: "div",
                handle: '.sort-handle',
                helper: function (e, item) {
                    if (!item.hasClass('ui-selected')) {
                        item.parent().children('.ui-selected').removeClass('ui-selected');
                        item.addClass('ui-selected');
                    }

                    let selected = item.parent().children('.ui-selected').clone();
                    item.data('multidrag', selected).siblings('.ui-selected').remove();
                    return $('<div/>').append(selected);

                },
                stop: function (e, ui) {
                    let selected = ui.item.data('multidrag');
                    ui.item.after(selected);
                    ui.item.remove();

                    // Setting focus to container after selecting text
                    // TODO Bugged
                    $("#main_container").focus();
                }
            });


        }

        convertSentenceToHtml() {

            const current_div = $(`<div class="pl-2 mt-2"> </div>`);
            const sort_handle_span = $(`<i class="fas fa-arrows-alt-v sort-handle"></i>`);
            current_div.append(sort_handle_span);

            // appends the parts of sentence array to the div
            $.each(this.parts, (index, element) => {
                if (typeof element === "object") {
                    const span = $(`<span>${element.string}</span>`);
                    // span.prop('stored_data', {
                    //     'name': element.string,
                    //     'viz_type': 'choropleth map',
                    //     'variable': 'income'
                    // });
                    span.attr('class', 'clickable_key_word')
                    current_div.append(span);
                } else {
                    current_div.append(element);
                }
            });

            // Add a period to every sentence
            current_div.append(".");
            return current_div;
        }

        convertHeadingToHtml(){
            const current_div = $(`<div class="pl-2 mt-2"> </div>`);
            current_div.append($(`<br>`))
            const sort_handle_span = $(`<i class="fas fa-arrows-alt-v sort-handle"></i>`);
            current_div.append(sort_handle_span);
            const span = $(`<span>${this.parts[0]}</span>`);
            //TODO fix class
            span.attr('class', 'heading')
            current_div.append(span);
            current_div.append($(`<br>`))

            return current_div;
        }

    }


// Expose ReportEditor
    window.V2T.Sentence = Sentence;

})();