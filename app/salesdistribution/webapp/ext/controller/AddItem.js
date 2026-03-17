sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Image",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (MessageToast, MessageBox, Dialog, Button, Image, Fragment, Filter, FilterOperator) {
    "use strict";

    var sFragmentId = "catalogPicker";
    var oCatalogDialog;
    var oImagePreviewDialog;
    var oImagePreviewControl;
    var oPendingHeaderContext;
    var oLastActionController;

    function getHeaderContext(oController, oContextFromAction) {
        if (oContextFromAction && oContextFromAction.getPath) {
            return oContextFromAction;
        }
        if (oController && oController.getView && oController.getView().getBindingContext) {
            return oController.getView().getBindingContext();
        }
        return null;
    }

    function getExtensionAPI(oController) {
        if (oController && oController.base && oController.base.getExtensionAPI) {
            return oController.base.getExtensionAPI();
        }
        if (oController && oController.getExtensionAPI) {
            return oController.getExtensionAPI();
        }
        return null;
    }

    function toNumber(vValue, vFallback) {
        var fParsed = Number(vValue);
        return Number.isFinite(fParsed) ? fParsed : vFallback;
    }

    function getCatalogTable() {
        return Fragment.byId(sFragmentId, "catalogTable");
    }

    function clearDialogState() {
        var oTable = getCatalogTable();
        if (!oTable) {
            return;
        }

        oTable.removeSelections(true);
        var oBinding = oTable.getBinding("items");
        if (oBinding) {
            oBinding.filter([]);
        }
    }

    function ensureImagePreviewDialog() {
        if (oImagePreviewDialog) {
            return oImagePreviewDialog;
        }

        oImagePreviewControl = new Image({
            width: "100%",
            densityAware: false,
            decorative: false
        });

        oImagePreviewDialog = new Dialog({
            title: "Product Image",
            contentWidth: "40rem",
            contentHeight: "40rem",
            draggable: true,
            resizable: true,
            content: [oImagePreviewControl],
            endButton: new Button({
                text: "Close",
                press: function () {
                    oImagePreviewDialog.close();
                }
            })
        });

        if (oLastActionController && oLastActionController.getView) {
            oLastActionController.getView().addDependent(oImagePreviewDialog);
        }

        return oImagePreviewDialog;
    }

    function openImagePreview(sImageUrl) {
        if (!sImageUrl) {
            MessageBox.information("No product image is available for this material.");
            return;
        }

        ensureImagePreviewDialog();
        oImagePreviewControl.setSrc(sImageUrl);
        oImagePreviewDialog.open();
    }

    function nextItemNumber(oHeaderContext) {
        var sItemsPath = oHeaderContext.getPath() + "/Item";
        var oItemsBinding = oHeaderContext.getModel().bindList(sItemsPath);
        return oItemsBinding.requestContexts(0, 1000).then(function (aContexts) {
            if (!Array.isArray(aContexts) || aContexts.length === 0) {
                return "10";
            }

            var iMax = 0;
            aContexts.forEach(function (oItemContext) {
                var oItem = oItemContext.getObject();
                var iValue = parseInt(oItem.ItemNumer, 10);
                if (Number.isFinite(iValue) && iValue > iMax) {
                    iMax = iValue;
                }
            });

            return String(iMax > 0 ? iMax + 10 : (aContexts.length + 1) * 10);
        });
    }

    function applyCatalogSelection() {
        var oHeaderContext = oPendingHeaderContext;
        var oTable = getCatalogTable();
        var aSelectedItems = oTable ? oTable.getSelectedItems() : [];

        if (!oHeaderContext || !aSelectedItems || aSelectedItems.length === 0) {
            MessageBox.warning("Select at least one catalog row first.");
            return;
        }

        nextItemNumber(oHeaderContext).then(async function (sItemNumber) {
            var iItemNumber = parseInt(sItemNumber, 10) || 10;
            var oModel = oHeaderContext.getModel();
            var sItemsPath = oHeaderContext.getPath() + "/Item";
            var oItemsBinding = oModel.bindList(sItemsPath);
            var aCreatePromises = [];

            aSelectedItems.forEach(function (oSelectedItem) {
                var oCatalogContext = oSelectedItem.getBindingContext();
                if (!oCatalogContext) {
                    return;
                }

                var oCatalog = oCatalogContext.getObject();
                var fQuantity = toNumber(oCatalog.MinimumQuantity, 1);
                var fUnitPrice = toNumber(oCatalog.Price, 0);
                var sCurrency = oCatalog.CurrencyCode_code || "USD";
                var oNewItem = {
                    ItemNumer: String(iItemNumber),
                    Material: oCatalog.ProductID || "",
                    Description: oCatalog.ShortDescription || "",
                    Plant: oCatalog.Supplier || "",
                    Quantity: fQuantity,
                    UnitPriceAmount: Number(fUnitPrice.toFixed(2)),
                    UnitPrice_code: sCurrency,
                    TotalValueAmount: Number((fQuantity * fUnitPrice).toFixed(2)),
                    TotalValue_code: sCurrency
                };

                var oCreatedContext = oItemsBinding.create(oNewItem);
                aCreatePromises.push(oCreatedContext.created());
                iItemNumber += 10;
            });

            if (aCreatePromises.length === 0) {
                MessageBox.error("No valid catalog rows selected.");
                return;
            }

            await Promise.all(aCreatePromises);
            await oModel.submitBatch("$auto");
            await oHeaderContext.requestSideEffects([
                { $NavigationPropertyPath: "Item" }
            ]);

            oCatalogDialog.close();
            MessageToast.show(aSelectedItems.length + " item(s) added from catalog.");
        }).catch(function (oError) {
            var sMessage = (oError && (oError.message || oError.toString())) || "Failed to add item from catalog.";
            MessageBox.error(sMessage);
        });
    }

    function ensureDialog(oModel) {
        if (oCatalogDialog) {
            oCatalogDialog.setModel(oModel);
            return Promise.resolve(oCatalogDialog);
        }

        return Fragment.load({
            id: sFragmentId,
            name: "salesdistribution.ext.fragment.CatalogDialog",
            controller: {
                onCatalogSearch: function (oEvent) {
                    var sValue = (oEvent.getParameter("newValue") || "").trim();
                    var oTable = getCatalogTable();
                    var oBinding = oTable && oTable.getBinding("items");
                    if (!oBinding) {
                        return;
                    }

                    if (!sValue) {
                        oBinding.filter([]);
                        return;
                    }

                    oBinding.filter([
                        new Filter({
                            filters: [
                                new Filter("ProductID", FilterOperator.Contains, sValue),
                                new Filter("ShortDescription", FilterOperator.Contains, sValue),
                                new Filter("Category", FilterOperator.Contains, sValue),
                                new Filter("Supplier", FilterOperator.Contains, sValue)
                            ],
                            and: false
                        })
                    ]);
                },
                onCatalogAddConfirm: function () {
                    applyCatalogSelection();
                },
                onCatalogImagePress: function (oEvent) {
                    var oSource = oEvent.getSource();
                    openImagePreview(oSource.getSrc());
                },
                onCatalogCancel: function () {
                    oPendingHeaderContext = null;
                    if (oCatalogDialog) {
                        oCatalogDialog.close();
                    }
                }
            }
        }).then(function (oDialog) {
            oCatalogDialog = oDialog;
            oCatalogDialog.setModel(oModel);
            oCatalogDialog.attachAfterClose(function () {
                clearDialogState();
            });

            if (oLastActionController && oLastActionController.getView) {
                oLastActionController.getView().addDependent(oCatalogDialog);
            }
            return oCatalogDialog;
        });
    }

    function openDialog(oController, oHeaderContext) {
        oPendingHeaderContext = oHeaderContext;
        oLastActionController = oController;

        var oExtensionAPI = getExtensionAPI(oController);
        var fnOpen = function () {
            ensureDialog(oHeaderContext.getModel()).then(function (oDialog) {
                oDialog.open();
            }).catch(function (oError) {
                var sMessage = (oError && (oError.message || oError.toString())) || "Failed to open catalog dialog.";
                MessageBox.error(sMessage);
            });
        };

        if (oExtensionAPI && oExtensionAPI.securedExecution) {
            oExtensionAPI.securedExecution(fnOpen);
            return;
        }

        fnOpen();
    }

    return {
        addItem: function (oContext, aSelectedContexts) {
            var oHeaderContext = getHeaderContext(this, oContext);
            if (!oHeaderContext) {
                MessageBox.error("Header context is not available.");
                return;
            }

            openDialog(this, oHeaderContext);
        }
    };
});
