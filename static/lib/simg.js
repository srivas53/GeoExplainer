/*jshint nonstandard:true */
(function (root) {
    let previousSimg = root.Simg;
    let Simg = root.Simg = function (svg, img_width, img_height) {
        this.svg = svg;
        this.img_width = img_width;
        this.img_height = img_height;
    };

    Simg.noConflict = function () {
        root.Simg = previousSimg;
        return this;
    };

    Simg.getBase64Image = function (img) {
        // From: http://stackoverflow.com/questions/934012/get-image-data-in-javascript
        let canvas = document.createElement("canvas");
        canvas.width = img.width;
        let ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        let dataURL = canvas.toDataURL("image/png");

        return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
    };

    Simg.prototype = {

        // Return SVG text.
        // # 4
        toString: function (svg) {
            if (!svg) {
                throw new Error('.toString: No SVG found.');
            }

            [
                ['version', 1.1],
                ['xmlns', "http://www.w3.org/2000/svg"],
            ].forEach(function (item) {
                svg.setAttribute(item[0], item[1]);
            });
            return svg.outerHTML;
        },

        // Return canvas with this SVG drawn inside.
        // #2
        toCanvas: function (cb) {
            this.toSvgImage(function (img, width, height) {
                let canvas = document.createElement('canvas');
                let context = canvas.getContext("2d");

                canvas.width = width;
                canvas.height = height;

                context.drawImage(img, 0, 0);
                cb(canvas);
            });
        },

        // #3
        toSvgImage: function (cb) {
            let str = this.toString(this.svg);
            let img = document.createElement('img');

            let img_width = this.img_width;
            let img_height = this.img_height;

            if (cb) {
                img.onload = function () {
                    cb(img, img_width, img_height);
                };
            }

            // Make the new img's source an SVG image.
            img.setAttribute('src', 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(str))));
        },

        // Returns callback to new img from SVG.
        // Call with no arguments to return svg image element.
        // Call with callback to return png image element.
        // # 1
        toImg: function (cb) {
            this.toCanvas(function (canvas) {
                let canvasData = canvas.toDataURL("image/png");
                let img = document.createElement('img');

                img.onload = function () {
                    cb(img);
                };

                // Make pngImg's source the canvas data.
                img.setAttribute('src', canvasData);
            });
        },

        // Replace SVG with PNG img.
        replace: function (cb) {
            let self = this;
            this.toImg(function (img) {
                let parentNode = self.svg.parentNode;
                parentNode.replaceChild(img, self.svg);
                if (cb) {
                    cb();
                }
            });
        },

        // Converts canvas to binary blob.
        toBinaryBlob: function (cb) {
            this.toCanvas(function (canvas) {
                let dataUrl = canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, "");
                let byteString = atob(escape(dataUrl));
                // write the bytes of the string to an ArrayBuffer
                let ab = new ArrayBuffer(byteString.length);
                let ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                let dataView = new DataView(ab);
                let blob = new Blob([dataView], {type: "image/png"});
                cb(blob);
            });
        },

        // Trigger download of image.
        download: function (filename) {
            /**
             * Wird auch von filename = 0 getriggert
             */
            if (!filename) {
                filename = 'chart';
            }
            this.toImg(function (img) {
                let a = document.createElement("a");
                // Name of the file being downloaded.
                a.download = filename + ".png";
                a.href = img.getAttribute('src');
                // Support for Firefox which requires inserting in dom.
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
        },

        saveOnServer: function (callback) {
            this.toImg(function (img) {
                let test = img.getAttribute('src');
                callback(test);
            });
            return true;
        }
    };
})(this);
