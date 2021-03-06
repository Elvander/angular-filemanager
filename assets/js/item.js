(function(window, angular, $) {
    "use strict";
    angular.module('FileManagerApp').factory('item', ['$http', '$translate', 'fileManagerConfig', 'chmod', function($http, $translate, fileManagerConfig, Chmod) {

        var Item = function(model, path) {
            var rawModel = {
                name: model && model.name || '',
                path: path || [],
                type: model && model.type || 'file',
                size: model && model.size || 0,
                date: convertDate(model && model.date),
                perms: new Chmod(model && model.rights),
                content: model && model.content || '',
                recursive: false,
                webPath: model && model.webPath || '',
                sizeKb: function() {
                    return Math.round(this.size / 1024, 1);
                },
                fullPath: function() {
                    return ('/' + this.path.join('/') + '/' + this.name).replace(/\/\//, '/');
                }
            };

            this.error = '';
            this.inprocess = false;

            this.model = angular.copy(rawModel);
            this.tempModel = angular.copy(rawModel);

            function convertDate(mysqlDate) {
                var d = (mysqlDate || '').toString().split(/[- :]/);
                return new Date(d[0], d[1] - 1, d[2], d[3], d[4], d[5]);
            }
        };

        Item.prototype.update = function() {
            angular.extend(this.model, angular.copy(this.tempModel));
            return this;
        };

        Item.prototype.revert = function() {
            angular.extend(this.tempModel, angular.copy(this.model));
            this.error = '';
            return this;
        };

        Item.prototype.defineCallback = function(data, success, error) {
            /* Check if there was some error in a 200 response */
            var self = this;
            if (data.result && data.result.error) {
                self.error = data.result.error;
                return typeof error === 'function' && error(data);
            }
            if (data.error) {
                self.error = data.error.message;
                return typeof error === 'function' && error(data);
            }
            self.update();
            return typeof success === 'function' && success(data);
        };

        Item.prototype.createFolder = function(success, error) {
            var self = this;
            var data = {params: {
                mode: "addfolder",
                path: self.tempModel.path.join('/'),
                name: self.tempModel.name
            }};

            if (self.tempModel.name.trim()) {
                self.inprocess = true;
                self.error = '';
                return $http.post(fileManagerConfig.createFolderUrl, data).success(function(data) {
                    self.defineCallback(data, success, error);
                }).error(function(data) {
                    self.error = data.result && data.result.error ?
                        data.result.error:
                        $translate.instant('error_creating_folder');
                    typeof error === 'function' && error(data);
                })['finally'](function() {
                    self.inprocess = false;
                });
            }
        };

        Item.prototype.rename = function(success, error) {
            var self = this;
            var data = {params: {
                "mode": "rename",
                "path": self.model.fullPath(),
                "newPath": self.tempModel.fullPath()
            }};
            if (self.tempModel.name.trim()) {
                self.inprocess = true;
                self.error = '';
                return $http.post(fileManagerConfig.renameUrl, data).success(function(data) {
                    self.defineCallback(data, success, error);
                }).error(function(data) {
                    self.error = data.result && data.result.error ?
                        data.result.error:
                        $translate.instant('error_renaming');
                    typeof error === 'function' && error(data);
                })['finally'](function() {
                    self.inprocess = false;
                });
            }
        };

        Item.prototype.copy = function(success, error) {
            var self = this;
            var data = {params: {
                mode: "copy",
                path: self.model.fullPath(),
                newPath: self.tempModel.fullPath()
            }};
            if (self.tempModel.name.trim()) {
                self.inprocess = true;
                self.error = '';
                return $http.post(fileManagerConfig.copyUrl, data).success(function(data) {
                    self.defineCallback(data, success, error);
                }).error(function(data) {
                    self.error = data.result && data.result.error ?
                        data.result.error:
                        $translate.instant('error_copying');
                    typeof error === 'function' && error(data);
                })['finally'](function() {
                    self.inprocess = false;
                });
            }
        };

        Item.prototype.compress = function(success, error) {
            var self = this;
            var data = {params: {
                mode: "compress",
                path: self.model.fullPath(),
                destination: self.tempModel.fullPath()
            }};
            if (self.tempModel.name.trim()) {
                self.inprocess = true;
                self.error = '';
                return $http.post(fileManagerConfig.compressUrl, data).success(function(data) {
                    self.defineCallback(data, success, error);
                }).error(function(data) {
                    self.error = data.result && data.result.error ?
                        data.result.error:
                        $translate.instant('error_compressing');
                    typeof error === 'function' && error(data);
                })['finally'](function() {
                    self.inprocess = false;
                });
            }
        };

        Item.prototype.extract = function(success, error) {
            var self = this;
            var data = {params: {
                mode: "extract",
                path: self.model.fullPath(),
                sourceFile: self.model.fullPath(),
                destination: self.tempModel.fullPath()
            }};

            self.inprocess = true;
            self.error = '';
            return $http.post(fileManagerConfig.extractUrl, data).success(function(data) {
                self.defineCallback(data, success, error);
            }).error(function(data) {
                self.error = data.result && data.result.error ?
                    data.result.error:
                    $translate.instant('error_extracting');
                typeof error === 'function' && error(data);
            })["finally"](function() {
                self.inprocess = false;
            });
        };

        Item.prototype.download = function() {
            var self = this;
            if (self.model.type !== 'dir') {
                window.open(self.preview(), '_blank', '');
            }
        };

        Item.prototype.preview = function(preview) {
            var self = this;
            var data = {
                mode: "download",
                preview: preview,
                path: self.model.fullPath()
            };
            return [fileManagerConfig.downloadFileUrl, $.param(data)].join('?');
        };

        Item.prototype.getContent = function(success, error) {
            var self = this;
            var data = {params: {
                mode: "editfile",
                path: self.tempModel.fullPath()
            }};
            self.inprocess = true;
            self.error = '';
            return $http.post(fileManagerConfig.getContentUrl, data).success(function(data) {
                self.tempModel.content = self.model.content = data.result;
                self.defineCallback(data, success, error);
            }).error(function(data) {
                self.error = data.result && data.result.error ?
                    data.result.error:
                    $translate.instant('error_getting_content');
                typeof error === 'function' && error(data);
            })['finally'](function() {
                self.inprocess = false;
            });
        };

        Item.prototype.remove = function(success, error) {
            var self = this;
            var data = {params: {
                mode: "delete",
                path: self.tempModel.fullPath()
            }};
            self.inprocess = true;
            self.error = '';
            return $http.post(fileManagerConfig.removeUrl, data).success(function(data) {
                self.defineCallback(data, success, error);
            }).error(function(data) {
                self.error = data.result && data.result.error ?
                    data.result.error:
                    $translate.instant('error_deleting');
                typeof error === 'function' && error(data);
            })['finally'](function() {
                self.inprocess = false;
            });
        };

        Item.prototype.edit = function(success, error) {
            var self = this;
            var data = {params: {
                mode: "savefile",
                content: self.tempModel.content,
                path: self.tempModel.fullPath()
            }};
            self.inprocess = true;
            self.error = '';

            return $http.post(fileManagerConfig.editUrl, data).success(function(data) {
                self.defineCallback(data, success, error);
            }).error(function(data) {
                self.error = data.result && data.result.error ?
                    data.result.error:
                    $translate.instant('error_modifying');
                typeof error === 'function' && error(data);
            })['finally'](function() {
                self.inprocess = false;
            });
        };

        Item.prototype.changePermissions = function(success, error) {
            var self = this;
            var data = {params: {
                mode: "changepermissions",
                path: self.tempModel.fullPath(),
                perms: self.tempModel.perms.toOctal(),
                permsCode: self.tempModel.perms.toCode(),
                recursive: self.tempModel.recursive
            }};
            self.inprocess = true;
            self.error = '';
            return $http.post(fileManagerConfig.permissionsUrl, data).success(function(data) {
                self.defineCallback(data, success, error);
            }).error(function(data) {
                self.error = data.result && data.result.error ?
                    data.result.error:
                    $translate.instant('error_changing_perms');
                typeof error === 'function' && error(data);
            })['finally'](function() {
                self.inprocess = false;
            });
        };

        Item.prototype.isFolder = function() {
            return this.model.type === 'dir';
        };

        Item.prototype.isEditable = function() {
            return !this.isFolder() && fileManagerConfig.isEditableFilePattern.test(this.model.name);
        };

        Item.prototype.isImage = function() {
            return fileManagerConfig.isImageFilePattern.test(this.model.name);
        };

        Item.prototype.isCompressible = function() {
            return this.isFolder();
        };

        Item.prototype.isExtractable = function() {
            return !this.isFolder() && fileManagerConfig.isExtractableFilePattern.test(this.model.name);
        };

        return Item;
    }]);
})(window, angular, jQuery);
