'use strict'; /* globals V2T */
(function () {

    function updateOnClickHandler() {
        // const all_sentenceSpans = $('.clickable_key_word');
        // all_sentenceSpans.click((event) => {
        //     alert(JSON.stringify($(event.target).prop('stored_data')));
        // });

        const $editSentenceModal = $('#editSentenceModal');
        const $editSentenceModalTextarea = $('#editSentenceModalTextarea');

        const $all_sentences = $('.draggable_text ');
        $all_sentences.contextmenu((event) => {
            event.preventDefault();
            event.stopPropagation();
            if ($($(event)[0].currentTarget)[0].id !== 'textCursor') {
                $editSentenceModal.modal('show');
                $editSentenceModalTextarea.val($($(event)[0].currentTarget)[0].innerText);

                const $textCursor = $('#textCursor');
                const $currentTarget = $($(event)[0].currentTarget);

                $($currentTarget[0].nextSibling).before($textCursor)

                $currentTarget.remove();
            }

        });
    }

    class ReportEditor extends V2T.Base {
        constructor() {
            super();

            this.text_curser_id = '#textCursor';

            // TODO Keypress event only on the right col
            $(function () {
                //Key handler
                $('body').keydown((e) => {
                    // e.preventDefault();
                    e.stopPropagation();

                    //Delete a sentence handler
                    if (!window.addSentenceMode && (e.code === 'Delete' || e.code === 'Backspace')) {
                        const current_selected_items = $('.ui-selected').not('#textCursor');
                        current_selected_items.remove();
                    }
                    //Add a custom sentence handler
                    if (e.code === 'NumpadAdd' || e.code === 'BracketRight') {
                        $('#addSentenceModal').modal();
                        window.addSentenceMode = true;
                    }
                    if (!window.addSentenceMode && e.code === 'Enter') {
                        const current_div = $(`<div class="pl-2 mt-2 draggable_text"> </div>`);
                        const sort_handle_span = $(`<i class="fas fa-arrows-alt-v sort-handle"></i>`);
                        current_div.append(sort_handle_span);
                        current_div.append($(`<span>&nbsp;&nbsp;&nbsp;&nbsp;</span>`));
                        current_div.insertAfter($('#textCursor'));
                    }
                });

                // Modal for custom sentence Handler
                const $addSentenceModal = $('#addSentenceModal');
                const $addSentenceModalTextarea = $('#addSentenceModalTextarea');
                const $addSentenceModalSentenceType = $('#addSentenceModalSentenceType');
                const $addSentenceModalButton = $('#addSentenceModalButton');
                const $btn_export_pdf = $('#btn_export_pdf');
                const $btn_generate_pdf = $('#btn_generate_pdf');
                const $pdfExportModal = $('#pdfExportModal');

                //Focus the textarea, such that the user can directly write
                $addSentenceModal.on('shown.bs.modal', function () {
                    $addSentenceModalTextarea.trigger('focus');
                });


                $addSentenceModalButton.click((event) => {

                    const sentence_to_add = new V2T.Sentence([$addSentenceModalTextarea.val()]);
                    let html_string;
                    switch ($addSentenceModalSentenceType.val()) {
                        case 'h':
                            html_string = sentence_to_add.convertHeadingToHtml();
                            break;
                        case 'n':
                            html_string = sentence_to_add.convertSentenceToHtml();
                            break;
                        default:
                            break;
                    }
                    // Generate sentence from input and append it after the cursor
                    html_string.insertAfter($('#textCursor'));
                    // Reset Text input
                    $addSentenceModalTextarea.val("");
                    // Close the modal
                    $addSentenceModal.modal('toggle');
                    window.addSentenceMode = false;
                });

                $btn_export_pdf.click((event) => {
                    $pdfExportModal.modal('show');
                });

                $btn_generate_pdf.click(() => {

                    const header_text = $('#inputHeaderTextPDFExport').val();
                    const footer_text = $('#inputFooterTextPDFExport').val();

                    const current_report_as_html = $('#textParent').clone();
                    const all_objects_without_cursor = $(current_report_as_html[0].innerHTML).not('#textCursor');

                    let sentences = [];
                    $.each(all_objects_without_cursor, (index, element) => {
                        let with_out_i = $("<div>" + element.innerHTML.split("</i>")[1] + "</div>");
                        const child_nodes = with_out_i[0].childNodes
                        let parts = [];
                        $.each(child_nodes, (i, f) => {
                            const $obj = $(f)[0];
                            if ($obj.nodeName === '#text') {
                                parts.push({'type': 'text', 'text': $obj.textContent})
                            } else if ($obj.nodeName === 'SPAN') {
                                if ($($obj).hasClass('heading')) {
                                    parts.push({'type': 'heading', 'text': $obj.innerText})
                                } else {
                                    parts.push({'type': 'bold', 'text': $obj.innerText})
                                }
                            } else if ($obj.nodeName === 'IMG') {
                                parts.push({'type': 'img', 'base64': $obj.getAttribute('src')})
                            } else {
                                console.log($obj.nodeName)
                            }
                        });
                        sentences.push(parts);
                    });
                    $.ajax({
                        type: "POST",
                        url: '/export_pdf',
                        data:
                            {
                                'text': JSON.stringify(sentences),
                                'csrfmiddlewaretoken': window.CSRF_TOKEN,
                                'header_text': header_text,
                                'footer_text': footer_text
                            }
                    }).done(function (data) {
                        let blob = new Blob([data]);
                        let link = document.createElement('a');
                        link.href = window.URL.createObjectURL(blob);
                        link.download = $('#inputFileNamePDFExport').val() + ".pdf";
                        link.click();
                        $pdfExportModal.modal('hide');
                    })
                });


                $('#editSentenceModalButton').click(() => {
                    const new_sentence = new V2T.Sentence([$('#editSentenceModalTextarea').val()]);
                    const new_sentence_html = new_sentence.convertSentenceToHtml();
                    new_sentence_html.insertAfter($('#textCursor'));
                    updateOnClickHandler();
                    $('#editSentenceModal').modal('hide');
                });

            });


        }

        addSentencesAfterCursor(sentence_list) {
            $.each(sentence_list, (index, sentence) => {
                const sentence_as_html = sentence.convertSentenceToHtml();
                sentence_as_html.insertAfter($(this.text_curser_id));
            });
            updateOnClickHandler();
        }


        addImageAfterCursor(base64_string, img_width = "auto", img_height = "auto") {
            const current_div = $(`<div class="pl-2 mt-2 draggable_text"> </div>`);
            const sort_handle_span = $(`<i class="fas fa-arrows-alt-v sort-handle"></i>`);
            // const image = $(`<img src="${base64_string}" width="${img_width}" height="${img_height}" alt="image of vast plot"/>`);
            const image = $(`<img src="${base64_string}" style="max-width:100%;max-height:100%;" alt="image of vast plot"/>`);
            current_div.append(sort_handle_span).append(image);
            current_div.insertAfter($(this.text_curser_id));
        }
    }

// Expose ReportEditor
    window.V2T.ReportEditor = ReportEditor;
})();