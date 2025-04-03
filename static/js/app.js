// static/js/app.js
Ext.application({
    name: 'BillingApp',
    extend: 'Ext.app.Application', // Define a basic Application class

/*    requires: [
        'Ext.container.Viewport',
        'Ext.grid.Panel',
        'Ext.window.Window',
        'Ext.form.Panel',
        'Ext.form.field.*',
        'Ext.layout.container.*',
        'Ext.data.Store',
        'Ext.data.Model',
        'Ext.data.proxy.Ajax',
        'Ext.data.reader.Json',
        'Ext.data.writer.Json',
        'Ext.toolbar.Paging',
        'Ext.plugin.Responsive', // For responsive design
        'Ext.plugin.Viewport', // Ensures components scale to viewport
        'Ext.button.Button',
        'Ext.tab.Panel',
        'Ext.Date',
        'Ext.MessageBox',
        'Ext.grid.filters.Filters', // Explicitly require gridfilters plugin class
        'Ext.grid.feature.Grouping' // Explicitly require grouping feature class
    ],*/
,
    // Define Models based on your backend data structure
    models: {
        Client: Ext.define('BillingApp.model.Client', {
            extend: 'Ext.data.Model',
            idProperty: 'id', // Assuming 'id' is the primary key
            fields: [
                { name: 'id', type: 'int', useNull: true }, // Allow null for new records
                { name: 'naam', type: 'string' },
                { name: 'adres', type: 'string' },
                { name: 'postcode', type: 'string' },
                { name: 'plaats', type: 'string' },
                { name: 'telefoon', type: 'string' },
                { name: 'email', type: 'string' }
            ],
            proxy: {
                type: 'ajax',
                // Base URL for the entity - ID will be appended for PUT/DELETE
                url: '/api/clienten',
                actionMethods: { // Specify HTTP methods
                    create : 'POST',
                    read   : 'GET',
                    update : 'PUT',
                    destroy: 'DELETE'
                },
                reader: {
                    type: 'json',
                    rootProperty: '', // Data is the root array
                    successProperty: 'success' // Assuming backend sends success status
                },
                writer: {
                    type: 'json',
                    writeAllFields: true, // Send all fields
                    encode: true,
                    rootProperty: '' // Send data directly as JSON object
                },
                listeners: {
                    exception: function(proxy, response, operation) {
                        var errorMsg = 'Server Error';
                        try {
                            var responseData = Ext.decode(response.responseText);
                            // Attempt to get error message from backend response
                            errorMsg = responseData.error || ('Status: ' + response.status + ' - ' + response.statusText);
                        } catch (e) {
                             errorMsg = 'Status: ' + response.status + ' - ' + response.statusText;
                        }
                        Ext.Msg.alert('Client Operation Failed', errorMsg + ' (' + operation.action + ')');
                        // Reject changes on the record(s) involved in the failed operation
                        if (operation.getRecords()) {
                            Ext.each(operation.getRecords(), function(record) {
                                if (record && record.reject) {
                                    record.reject();
                                }
                            });
                        }
                         // Optionally reload the store to ensure consistency after error
                        // Ext.getStore('clients').load();
                    }
                }
            }
        }),

        TreatmentType: Ext.define('BillingApp.model.TreatmentType', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [
                { name: 'id', type: 'int', useNull: true },
                { name: 'naam', type: 'string' },
                { name: 'beschrijving', type: 'string' },
                { name: 'prijs', type: 'float' },
                { name: 'prijs_type', type: 'string' } // e.g., 'per_uur', 'per_sessie'
            ],
             proxy: { // Corrected proxy
                type: 'ajax',
                url: '/api/behandelingen_types', // Base URL
                actionMethods: { create : 'POST', read : 'GET', update : 'PUT', destroy: 'DELETE' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success' },
                writer: { type: 'json', writeAllFields: true, encode: true, rootProperty: '' },
                listeners: { exception: function(proxy, response, operation) { /* ... similar error handling ... */
                     var errorMsg = 'Server Error';
                        try {
                            var responseData = Ext.decode(response.responseText);
                             errorMsg = responseData.error || ('Status: ' + response.status + ' - ' + response.statusText);
                        } catch (e) { errorMsg = 'Status: ' + response.status + ' - ' + response.statusText; }
                        Ext.Msg.alert('Treatment Type Operation Failed', errorMsg + ' (' + operation.action + ')');
                         if (operation.getRecords()) { Ext.each(operation.getRecords(), function(record){ if (record && record.reject) record.reject(); }); }
                } }
            }
        }),

        Treatment: Ext.define('BillingApp.model.Treatment', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [
                { name: 'id', type: 'int', useNull: true },
                { name: 'client_id', type: 'int', reference: 'Client' }, // Add reference for potential associations
                { name: 'behandeling_type_id', type: 'int', reference: 'TreatmentType' },
                { name: 'datum', type: 'date', dateFormat: 'Y-m-d' }, // Ensure format matches backend
                { name: 'aantal_uren', type: 'float', useNull: true }, // Can be null if price is per session
                { name: 'gefactureerd', type: 'boolean', defaultValue: false },
                { name: 'factuur_id', type: 'int', useNull: true, reference: 'Invoice'},
                // Fields from related tables (read-only, populated by backend)
                { name: 'client_naam', type: 'string', mapping: 'clienten.naam', persist: false },
                { name: 'behandeling_type_naam', type: 'string', mapping: 'behandelingen_types.naam', persist: false },
                { name: 'prijs_type', type: 'string', mapping: 'behandelingen_types.prijs_type', persist: false},
                { name: 'prijs', type: 'float', mapping: 'behandelingen_types.prijs', persist: false}
            ],
            proxy: { // Corrected proxy
                type: 'ajax',
                url: '/api/behandelingen', // Base URL
                actionMethods: { create : 'POST', read : 'GET', update : 'PUT', destroy: 'DELETE' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success', totalProperty: 'totalCount' }, // Added totalProperty for paging
                writer: {
                    type: 'json',
                    writeAllFields: false, // Only send fields that are not persist: false
                    dateFormat: 'Y-m-d', // Send date in correct format
                    encode: true,
                    rootProperty: ''
                 },
                listeners: { exception: function(proxy, response, operation) { /* ... similar error handling ... */
                     var errorMsg = 'Server Error';
                        try {
                            var responseData = Ext.decode(response.responseText);
                            errorMsg = responseData.error || ('Status: ' + response.status + ' - ' + response.statusText);
                        } catch (e) { errorMsg = 'Status: ' + response.status + ' - ' + response.statusText; }
                        Ext.Msg.alert('Treatment Operation Failed', errorMsg + ' (' + operation.action + ')');
                         if (operation.getRecords()) { Ext.each(operation.getRecords(), function(record){ if (record && record.reject) record.reject(); }); }
                 } }
            }
        }),

        Invoice: Ext.define('BillingApp.model.Invoice', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [
                { name: 'id', type: 'int', useNull: true },
                { name: 'factuur_nummer', type: 'string' },
                { name: 'client_id', type: 'int', reference: 'Client' },
                { name: 'datum', type: 'date', dateFormat: 'Y-m-d' },
                { name: 'start_datum', type: 'date', dateFormat: 'Y-m-d' },
                { name: 'eind_datum', type: 'date', dateFormat: 'Y-m-d' },
                { name: 'totaal_bedrag', type: 'float' },
                { name: 'betaald', type: 'boolean' },
                 // Fields from related tables (read-only)
                { name: 'client_naam', type: 'string', mapping: 'clienten.naam', persist: false }
            ],
            proxy: { // Read-only proxy for invoices list, actions handled separately via Ajax requests
                type: 'ajax',
                url: '/api/facturen',
                actionMethods: { read : 'GET' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success', totalProperty: 'totalCount' }, // Added totalProperty
                listeners: { exception: function(proxy, response, operation) { /* ... similar error handling ... */
                    var errorMsg = 'Server Error';
                        try {
                            var responseData = Ext.decode(response.responseText);
                            errorMsg = responseData.error || ('Status: ' + response.status + ' - ' + response.statusText);
                        } catch (e) { errorMsg = 'Status: ' + response.status + ' - ' + response.statusText; }
                        Ext.Msg.alert('Invoice Operation Failed', errorMsg + ' (' + operation.action + ')');
                        // No records to reject on read typically
                 } }
            }
        })
    },

    // Define Stores
    stores: {
        clients: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.Client',
            autoLoad: true,
            remoteSort: false, // Example: Sort locally
            sorters: [{ property: 'naam', direction: 'ASC' }]
        }),
        treatmentTypes: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.TreatmentType',
            autoLoad: true,
             remoteSort: false,
             sorters: [{ property: 'naam', direction: 'ASC' }]
        }),
        treatments: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.Treatment',
            autoLoad: true,
            remoteSort: true, // Example: Sort remotely
            remoteFilter: true, // Example: Filter remotely
            sorters: [{ property: 'datum', direction: 'DESC' }],
            groupField: 'client_naam', // Example grouping
            pageSize: 50, // Enable paging
            // Proxy is defined on the model, store uses the model's proxy
            proxy: {
                type: 'ajax',
                url: '/api/behandelingen',
                 actionMethods: { read : 'GET' }, // Only need read for store loading
                reader: { type: 'json', rootProperty: '', totalProperty: 'totalCount', successProperty: 'success' }
            }
        }),
        invoices: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.Invoice',
            autoLoad: true,
            remoteSort: true, // Example: Sort remotely
            remoteFilter: true, // Example: Filter remotely
            sorters: [{ property: 'datum', direction: 'DESC' }],
            pageSize: 50, // Enable paging
             // Proxy is defined on the model, store uses the model's proxy
            proxy: {
                type: 'ajax',
                url: '/api/facturen',
                 actionMethods: { read : 'GET' },
                reader: { type: 'json', rootProperty: '', totalProperty: 'totalCount', successProperty: 'success' }
            }
        })
    },

    launch: function () {
        // Hide loading mask
        var loadingMask = Ext.get('loading-mask');
        if (loadingMask) {
            loadingMask.fadeOut({ duration: 500, remove: true });
        }

        // --- Define Controller ---
        // Using a simple controller directly in the application for brevity
        // In larger apps, this would be in a separate file (e.g., app/controller/Main.js)
        Ext.define('BillingApp.controller.Main', {
            extend: 'Ext.app.Controller',

            refs: [ // Component references for easy access
                { ref: 'clientGrid', selector: 'gridpanel[title=Clients]' },
                { ref: 'treatmentGrid', selector: 'gridpanel[title=Treatments]' },
                { ref: 'invoiceGrid', selector: 'gridpanel[title=Invoices]' },
                { ref: 'treatmentTypeGrid', selector: 'gridpanel[title=Treatment Types]' },
                { ref: 'clientForm', selector: 'window[title^=Client] form' }, // More robust selector
                { ref: 'treatmentForm', selector: 'window[title^=Treatment] form' },
                { ref: 'treatmentTypeForm', selector: 'window[title^=Treatment Type] form' },
                { ref: 'generateInvoiceForm', selector: 'window[title=Generate Invoices] form' },
                { ref: 'exportForm', selector: 'window[title^=Export Summary] form' },
                { ref: 'hoursField', selector: 'window[title^=Treatment] numberfield[name=aantal_uren]'} // Specific reference
            ],

            init: function() {
                this.control({ // Event listeners
                    'gridpanel[title=Clients] button[text=Add Client]': { click: this.onAddClientClick },
                    'gridpanel[title=Clients] button[text=Edit Client]': { click: this.onEditClientClick },
                    'gridpanel[title=Clients] button[text=Delete Client]': { click: this.onDeleteClientClick },
                    'gridpanel[title=Clients]': { itemdblclick: this.onEditClientClick }, // Edit on double click

                    'gridpanel[title=Treatment Types] button[text=Add Type]': { click: this.onAddTreatmentTypeClick },
                    'gridpanel[title=Treatment Types] button[text=Edit Type]': { click: this.onEditTreatmentTypeClick },
                    'gridpanel[title=Treatment Types] button[text=Delete Type]': { click: this.onDeleteTreatmentTypeClick },
                    'gridpanel[title=Treatment Types]': { itemdblclick: this.onEditTreatmentTypeClick },

                    'gridpanel[title=Treatments] button[text=Add Treatment]': { click: this.onAddTreatmentClick },
                    'gridpanel[title=Treatments] button[text=Edit Treatment]': { click: this.onEditTreatmentClick },
                    'gridpanel[title=Treatments] button[text=Delete Treatment]': { click: this.onDeleteTreatmentClick },
                    'gridpanel[title=Treatments]': { itemdblclick: this.onTreatmentItemDblClick }, // Custom handler for dblclick

                     'gridpanel[title=Invoices] button[text=Generate Invoices]': { click: this.onGenerateInvoicesClick },
                     'gridpanel[title=Invoices] button[text=View PDF]': { click: this.onViewInvoicePdfClick },
                     'gridpanel[title=Invoices] button[text=Mark as Paid]': { click: this.onMarkPaidClick },
                     'gridpanel[title=Invoices] button[text=Export Summary]': { click: this.onExportClick },
                     'gridpanel[title=Invoices]': { itemdblclick: this.onViewInvoicePdfClick },

                    // Window buttons
                    'window[title^=Client] button[text=Save]': { click: this.onSaveClient },
                    'window[title^=Client] button[text=Cancel]': { click: this.closeWindow },
                    'window[title^=Treatment Type] button[text=Save]': { click: this.onSaveTreatmentType },
                    'window[title^=Treatment Type] button[text=Cancel]': { click: this.closeWindow },
                    'window[title^=Treatment] button[text=Save]': { click: this.onSaveTreatment },
                    'window[title^=Treatment] button[text=Cancel]': { click: this.closeWindow },
                    'window[title=Generate Invoices] button[text=Generate]': { click: this.onConfirmGenerateInvoices },
                    'window[title=Generate Invoices] button[text=Cancel]': { click: this.closeWindow },
                    'window[title^=Export Summary] button[text=Export]': { click: this.onConfirmExport },
                    'window[title^=Export Summary] button[text=Cancel]': { click: this.closeWindow },

                     // Form field listeners
                     'window[title^=Treatment] combobox[name=behandeling_type_id]': { select: this.onTreatmentTypeSelect }
                });
            },

            // --- Helper Functions ---
            closeWindow: function(button) {
                button.up('window').close();
            },

            getSelectedRecord: function(gridRefName) {
                 var grid = this.getRef(gridRefName); // Use generated getter, e.g., getClientGrid()
                 if (!grid) return null;
                var selection = grid.getSelectionModel().getSelection();
                return selection.length > 0 ? selection[0] : null;
            },

            // --- Event Handlers ---

             onAddClientClick: function() {
                 this.createClientWindow(); // No record passed for add
             },

            onEditClientClick: function(buttonOrGrid) { // Can be called by button or grid dblclick
                 var record = this.getSelectedRecord('clientGrid');
                 if (record) {
                     this.createClientWindow(record);
                 } else {
                     Ext.Msg.alert('Selection Error', 'Please select a client to edit.');
                 }
             },

             onDeleteClientClick: function() {
                 var record = this.getSelectedRecord('clientGrid');
                 if (record) {
                     Ext.Msg.confirm('Confirm Delete', 'Are you sure you want to delete client "' + record.get('naam') + '"?', function(btn) {
                         if (btn === 'yes') {
                            var store = Ext.getStore('clients');
                            store.remove(record); // Remove immediately from UI
                            record.erase({ // Trigger DELETE request via model proxy
                                success: function() {
                                    // No need to remove again, already done
                                    Ext.Msg.alert('Success', 'Client deleted.');
                                    // store.commitChanges(); // Optional: commit removal if needed? Usually not for erase.
                                },
                                failure: function(rec, operation) {
                                    // Error shown by proxy listener
                                    // Add the record back to the store if deletion failed
                                    store.insert(operation.request.getRecords()[0].index || 0, rec);
                                    console.error('Failed to delete client', operation);
                                }
                            });
                         }
                     }, this);
                 } else {
                      Ext.Msg.alert('Selection Error', 'Please select a client to delete.');
                 }
             },

            onSaveClient: function(button) {
                var win = button.up('window');
                var form = win.down('form').getForm(); // Use down() instead of ref for robustness here

                if (form.isValid()) {
                    var values = form.getValues();
                    var store = Ext.getStore('clients');
                    var record;

                     var id = form.findField('id').getValue(); // Get ID from hidden field

                     if (id) { // Editing existing
                        record = store.getById(parseInt(id));
                          if (record) {
                              record.set(values); // Update record with form values
                          } else {
                              Ext.Msg.alert('Error', 'Record not found for update.');
                              win.close();
                              return;
                          }
                     } else { // Adding new
                         // Remove null ID before creating
                        record = Ext.create('BillingApp.model.Client', values);
                          store.add(record); // Add tentatively
                     }

                    win.setLoading('Saving...');
                    record.save({ // Uses model proxy
                        callback: function(savedRecord, operation, success) { // Unified callback
                             win.setLoading(false);
                             if (success) {
                                win.close();
                                Ext.Msg.alert('Success', 'Client saved.');
                                store.load(); // Reload store for consistency (optional, depends on needs)
                             } else {
                                 // Error already shown by proxy listener
                                 // Reject changes on store if save failed
                                 store.rejectChanges();
                                 // If it was a new record add that failed, remove it from store
                                 if (operation.action === 'create') {
                                     store.remove(savedRecord);
                                 }
                                 console.error('Failed to save client', operation);
                             }
                        }
                    });
                }
            },

             // --- Treatment Type Handlers ---
             onAddTreatmentTypeClick: function() {
                this.createTreatmentTypeWindow();
            },
            onEditTreatmentTypeClick: function(buttonOrGrid) {
                var record = this.getSelectedRecord('treatmentTypeGrid');
                if (record) {
                    this.createTreatmentTypeWindow(record);
                } else {
                    Ext.Msg.alert('Selection Error', 'Please select a treatment type to edit.');
                }
            },
            onDeleteTreatmentTypeClick: function() {
                var record = this.getSelectedRecord('treatmentTypeGrid');
                if (record) {
                    Ext.Msg.confirm('Confirm Delete', 'Delete type "' + record.get('naam') + '"? Check usage first.', function(btn) {
                        if (btn === 'yes') {
                           var store = Ext.getStore('treatmentTypes');
                           store.remove(record);
                            record.erase({
                                success: function() { Ext.Msg.alert('Success', 'Treatment type deleted.'); },
                                failure: function(rec, op) { store.insert(op.request.getRecords()[0].index || 0, rec); } // Add back on failure
                            });
                        }
                    }, this);
                } else {
                     Ext.Msg.alert('Selection Error', 'Please select a treatment type to delete.');
                }
            },
            onSaveTreatmentType: function(button) {
                 var win = button.up('window');
                 var form = win.down('form').getForm();
                 if (form.isValid()) {
                     var values = form.getValues();
                     var store = Ext.getStore('treatmentTypes');
                     var record;
                     var id = form.findField('id').getValue();
                     if (id) { // Editing
                         record = store.getById(parseInt(id));
                         if(record) record.set(values);
                         else { Ext.Msg.alert('Error', 'Record not found.'); win.close(); return; }
                     } else { // Adding
                         record = Ext.create('BillingApp.model.TreatmentType', values);
                         store.add(record);
                     }
                     win.setLoading('Saving...');
                     record.save({
                         callback: function(rec, op, success) {
                              win.setLoading(false);
                              if (success) {
                                  win.close();
                                  Ext.Msg.alert('Success', 'Treatment type saved.');
                                  store.load();
                              } else {
                                   store.rejectChanges();
                                   if(op.action === 'create') store.remove(rec);
                              }
                         }
                     });
                 }
            },


             // --- Treatment Handlers ---
              onAddTreatmentClick: function() {
                 this.createTreatmentWindow();
             },

            onEditTreatmentClick: function(buttonOrGrid) {
                var record = this.getSelectedRecord('treatmentGrid');
                if (record) {
                    if(record.get('gefactureerd')) {
                        Ext.Msg.alert('Edit Error', 'Cannot edit an invoiced treatment.');
                        return;
                    }
                    this.createTreatmentWindow(record);
                } else {
                     Ext.Msg.alert('Selection Error', 'Please select a treatment to edit.');
                }
            },

            onTreatmentItemDblClick: function(grid, record) { // Specific handler for dblclick
                if (!record.get('gefactureerd')) { // Only edit if not invoiced
                    this.createTreatmentWindow(record); // Call the creation method
                 } else {
                    Ext.Msg.alert('Edit Error', 'Cannot edit an invoiced treatment.');
                 }
            },

            onDeleteTreatmentClick: function() {
                var record = this.getSelectedRecord('treatmentGrid');
                if (record) {
                     if(record.get('gefactureerd')) {
                        Ext.Msg.alert('Delete Error', 'Cannot delete an invoiced treatment.');
                        return;
                    }
                    Ext.Msg.confirm('Confirm Delete', 'Delete this treatment record?', function(btn) {
                        if (btn === 'yes') {
                             var store = Ext.getStore('treatments');
                             store.remove(record);
                            record.erase({
                                success: function() { Ext.Msg.alert('Success', 'Treatment deleted.'); },
                                failure: function(rec, op) { store.insert(op.request.getRecords()[0].index || 0, rec); } // Add back
                            });
                        }
                    }, this);
                } else {
                     Ext.Msg.alert('Selection Error', 'Please select a treatment to delete.');
                }
            },

            onSaveTreatment: function(button) {
                var win = button.up('window');
                var form = win.down('form').getForm(); // Use direct down('form')

                if (form.isValid()) {
                    var values = form.getValues();
                    var store = Ext.getStore('treatments');
                    var record;

                    // Ensure date is formatted correctly for backend
                    values.datum = Ext.Date.format(form.findField('datum').getValue(), 'Y-m-d');

                    // Handle blank hours based on type
                    var typeStore = Ext.getStore('treatmentTypes');
                    var typeRecord = typeStore.getById(parseInt(values.behandeling_type_id));
                    var hoursField = form.findField('aantal_uren');
                    if (typeRecord && typeRecord.get('prijs_type') !== 'per_uur') {
                        values.aantal_uren = null; // Set hours to null if not hourly
                    } else if (!hoursField.isDisabled() && (!values.aantal_uren || values.aantal_uren <= 0)) {
                        // If hourly type is selected (field enabled) but hours are missing/invalid
                        // Depending on strictness, either mark invalid or allow null
                        // hoursField.markInvalid('Hours are required for this treatment type.'); return; // Strict
                         values.aantal_uren = null; // Allow null if backend handles it, or default value needed
                         // Or set a default if applicable: values.aantal_uren = 1;
                    }

                     var id = form.findField('id').getValue();
                     if (id) { // Editing
                        record = store.getById(parseInt(id));
                          if (record) {
                              record.set(values);
                          } else {
                               Ext.Msg.alert('Error', 'Record not found for update.'); win.close(); return;
                          }
                     } else { // Adding
                         record = Ext.create('BillingApp.model.Treatment', values);
                          store.add(record);
                     }

                    win.setLoading('Saving...');
                    record.save({
                        callback: function(rec, op, success) {
                            win.setLoading(false);
                             if (success) {
                                win.close();
                                Ext.Msg.alert('Success', 'Treatment saved.');
                                store.load(); // Reload to get updated calculated fields/joins
                             } else {
                                 store.rejectChanges();
                                 if(op.action === 'create') store.remove(rec);
                             }
                        }
                    });
                }
            },

            // Handler in form controller or main app controller
            onTreatmentTypeSelect: function(combo, record) {
                 // Get the form the combo is in
                 var form = combo.up('form');
                 // Find the hours field within that form
                 var hoursField = form.down('numberfield[name=aantal_uren]'); // Use down() with selector

                 if (hoursField) { // Check if field exists
                     if (record && record.get('prijs_type') === 'per_uur') {
                         hoursField.enable();
                         hoursField.allowBlank = false; // Make required if hourly
                         hoursField.validate(); // Re-validate
                     } else {
                         hoursField.disable();
                         hoursField.setValue(null); // Clear value if disabled
                         hoursField.allowBlank = true; // Not required
                         hoursField.clearInvalid(); // Clear potential validation errors
                     }
                 } else {
                    console.warn("Could not find 'aantal_uren' field in the treatment form.");
                 }
            },

             // --- Invoice Handlers ---
            onGenerateInvoicesClick: function() {
                this.createGenerateInvoiceWindow();
            },

             onConfirmGenerateInvoices: function(button) {
                 var win = button.up('window');
                 var form = win.down('form').getForm();
                 if (form.isValid()) {
                     var values = form.getValues();
                     var startDate = Ext.Date.format(form.findField('start_datum').getValue(), 'Y-m-d');
                     var endDate = Ext.Date.format(form.findField('eind_datum').getValue(), 'Y-m-d');

                     win.setLoading('Generating Invoices...');
                     Ext.Ajax.request({
                         url: '/api/facturen/generate',
                         method: 'POST',
                         jsonData: { start_datum: startDate, eind_datum: endDate },
                         success: function(response) {
                             win.setLoading(false);
                             var result = Ext.decode(response.responseText);
                             if (result.success) {
                                 win.close();
                                 Ext.Msg.alert('Success', result.aantal_facturen + ' invoice(s) generated.');
                                 Ext.getStore('invoices').load();
                                 Ext.getStore('treatments').load();
                             } else {
                                 Ext.Msg.alert('Generation Failed', result.error || 'Unknown error');
                             }
                         },
                         failure: function(response) {
                             win.setLoading(false);
                             var errorMsg = 'Server Error';
                              try { errorMsg = Ext.decode(response.responseText).error || errorMsg; } catch(e){}
                             Ext.Msg.alert('Error', 'Invoice generation failed: ' + errorMsg);
                         }
                     });
                 }
             },

             onViewInvoicePdfClick: function(buttonOrGrid) {
                 var record = this.getSelectedRecord('invoiceGrid');
                 if (record) {
                     var pdfUrl = '/api/facturen/' + record.getId() + '/pdf';
                     window.open(pdfUrl, '_blank');
                 } else {
                     Ext.Msg.alert('Selection Error', 'Please select an invoice to view.');
                 }
             },

             onMarkPaidClick: function() {
                 var record = this.getSelectedRecord('invoiceGrid');
                 if (record) {
                      if (record.get('betaald')) {
                          Ext.Msg.alert('Info', 'This invoice is already marked as paid.');
                          return;
                      }

                     Ext.Msg.confirm('Confirm Payment', 'Mark invoice ' + record.get('factuur_nummer') + ' as paid?', function(btn) {
                         if (btn === 'yes') {
                              var grid = this.getInvoiceGrid(); // Use ref getter
                              if(grid) grid.setLoading('Updating status...');
                             Ext.Ajax.request({
                                 url: '/api/facturen/' + record.getId() + '/betaald',
                                 method: 'PUT',
                                 success: function(response) {
                                     if(grid) grid.setLoading(false);
                                     // No need to decode response if backend is just confirming with 200 OK
                                      record.set('betaald', true); // Update client-side record
                                      record.commit(); // Commit the change in the store
                                     Ext.Msg.alert('Success', 'Invoice marked as paid.');
                                     // Optional: Refresh row styling if needed
                                     // grid.getView().refreshNode(record);
                                 },
                                 failure: function(response) {
                                      if(grid) grid.setLoading(false);
                                      var errorMsg = 'Server Error';
                                      try { errorMsg = Ext.decode(response.responseText).error || errorMsg; } catch(e){}
                                     Ext.Msg.alert('Error', 'Failed to mark invoice as paid: ' + errorMsg);
                                 }
                             });
                         }
                     }, this);
                 } else {
                     Ext.Msg.alert('Selection Error', 'Please select an invoice to mark as paid.');
                 }
             },

            onExportClick: function() {
                this.createExportWindow(); // Show the date range window first
            },

             onConfirmExport: function(button) { // Renamed handler for export confirm button
                 var win = button.up('window');
                 var form = win.down('form').getForm();
                 if (form.isValid()) {
                     var values = form.getValues();
                     var startDate = Ext.Date.format(form.findField('start_datum').getValue(), 'Y-m-d');
                     var endDate = Ext.Date.format(form.findField('eind_datum').getValue(), 'Y-m-d');

                      // Construct URL with query parameters
                     var exportUrl = '/api/export/excel?start_datum=' + encodeURIComponent(startDate) + '&eind_datum=' + encodeURIComponent(endDate);

                     // Trigger download by navigating the main window (or a hidden iframe)
                     // Using window.location is simplest for GET requests that trigger downloads
                     window.location.href = exportUrl;


                     // Alternative using hidden iframe (might be slightly cleaner)
                     /*
                     var iframe = Ext.getBody().createChild({
                        tag: 'iframe',
                        cls: 'x-hidden', // Hide it
                        src: exportUrl
                     });
                     // Remove iframe after a delay
                     Ext.defer(function() {
                        if (iframe) { iframe.remove(); }
                     }, 5000); // Remove after 5 seconds
                     */

                     win.close(); // Close the date selection window
                 }
            },


            // --- Window Creation Functions (moved to controller) ---

            createClientWindow: function(record) {
                var isEdit = !!record; // Simplified check
                var win = Ext.create('Ext.window.Window', {
                     title: isEdit ? 'Edit Client: ' + record.get('naam') : 'Add Client',
                     modal: true,
                     width: 500, minWidth: 300, layout: 'fit',
                     plugins: 'responsive',
                      responsiveFormulas: { small: 'width < 550', large: 'width >= 550' },
                      responsiveConfig: { small: { width: '95%' }, large: { width: 500 } },
                     items: [{
                         xtype: 'form',
                         // reference: 'clientForm', // Ref can be used but direct selection is fine too
                         bodyPadding: 15,
                         defaults: { anchor: '100%', allowBlank: false, labelAlign: 'top' },
                         items: [
                             { xtype: 'hiddenfield', name: 'id' }, // Let form loadRecord populate it
                             { xtype: 'textfield', name: 'naam', fieldLabel: 'Name' },
                             { xtype: 'textfield', name: 'adres', fieldLabel: 'Address' },
                             { xtype: 'textfield', name: 'postcode', fieldLabel: 'Postcode' },
                             { xtype: 'textfield', name: 'plaats', fieldLabel: 'City' },
                             { xtype: 'textfield', name: 'telefoon', fieldLabel: 'Phone', allowBlank: true },
                             { xtype: 'textfield', name: 'email', fieldLabel: 'Email', vtype: 'email', allowBlank: true }
                         ],
                         buttons: [ // Buttons managed by controller listeners now
                            { text: 'Save', formBind: true, ui: 'action', action: 'saveClient' }, // Add action for listener
                            { text: 'Cancel', action: 'cancelClient' }
                        ]
                     }]
                 });
                 if (isEdit) {
                     win.down('form').loadRecord(record); // Load data if editing
                 }
                 win.show();
             },

             createTreatmentTypeWindow: function(record) {
                 var isEdit = !!record;
                 var win = Ext.create('Ext.window.Window', {
                     title: isEdit ? 'Edit Treatment Type: ' + record.get('naam') : 'Add Treatment Type',
                     modal: true, width: 500, minWidth: 300, layout: 'fit',
                     plugins: 'responsive', responsiveConfig: { 'width < 550': { width: '95%' }, 'width >= 550': { width: 500 } },
                     items: [{
                         xtype: 'form', bodyPadding: 15, defaults: { anchor: '100%', labelAlign: 'top' },
                         items: [
                             { xtype: 'hiddenfield', name: 'id' },
                             { xtype: 'textfield', name: 'naam', fieldLabel: 'Name', allowBlank: false },
                             { xtype: 'textareafield', name: 'beschrijving', fieldLabel: 'Description', allowBlank: true },
                             { xtype: 'numberfield', name: 'prijs', fieldLabel: 'Price (€)', allowBlank: false, minValue: 0 },
                             { xtype: 'combobox', name: 'prijs_type', fieldLabel: 'Price Type', store: ['per_uur', 'per_sessie'], allowBlank: false, forceSelection: true, value: 'per_sessie' } // Default value
                         ],
                          buttons: [
                             { text: 'Save', formBind: true, ui: 'action', action: 'saveTreatmentType' },
                             { text: 'Cancel', action: 'cancelTreatmentType' }
                         ]
                     }]
                 });
                  if (isEdit) { win.down('form').loadRecord(record); }
                  win.show();
             },

             createTreatmentWindow: function(record) {
                 var isEdit = !!record;
                 var win = Ext.create('Ext.window.Window', {
                     title: isEdit ? 'Edit Treatment' : 'Add Treatment',
                     modal: true, width: 550, minWidth: 320, layout: 'fit',
                     plugins: 'responsive', responsiveConfig: { 'width < 600': { width: '95%' }, 'width >= 600': { width: 550 } },
                     items: [{
                         xtype: 'form', bodyPadding: 15, defaults: { anchor: '100%', labelAlign: 'top' },
                         items: [
                             { xtype: 'hiddenfield', name: 'id' },
                             { xtype: 'combobox', name: 'client_id', fieldLabel: 'Client', store: 'clients', displayField: 'naam', valueField: 'id', allowBlank: false, forceSelection: true, queryMode: 'local' },
                             { xtype: 'combobox', name: 'behandeling_type_id', fieldLabel: 'Treatment Type', store: 'treatmentTypes', displayField: 'naam', valueField: 'id', allowBlank: false, forceSelection: true, queryMode: 'local' }, // Listener attached via controller
                             { xtype: 'datefield', name: 'datum', fieldLabel: 'Date', format: 'Y-m-d', allowBlank: false, value: new Date() }, // Default value
                             { xtype: 'numberfield', name: 'aantal_uren', fieldLabel: 'Hours', allowBlank: true, minValue: 0.1, step: 0.25, disabled: true } // Initially disabled, enabled by listener
                         ],
                          buttons: [
                             { text: 'Save', formBind: true, ui: 'action', action: 'saveTreatment' },
                             { text: 'Cancel', action: 'cancelTreatment' }
                         ]
                     }]
                 });
                  if (isEdit) {
                    win.down('form').loadRecord(record);
                    // Manually trigger select listener logic after loading record
                    var typeCombo = win.down('combobox[name=behandeling_type_id]');
                    var typeStore = Ext.getStore('treatmentTypes');
                    var typeRecord = typeStore.getById(record.get('behandeling_type_id'));
                    this.onTreatmentTypeSelect(typeCombo, typeRecord); // Call handler directly
                 }
                  win.show();
             },

              createGenerateInvoiceWindow: function() {
                 Ext.create('Ext.window.Window', {
                     title: 'Generate Invoices', modal: true, width: 400, layout: 'fit',
                     plugins: 'responsive', responsiveConfig: { 'width < 450': { width: '95%' }, 'width >= 450': { width: 400 } },
                     items: [{
                         xtype: 'form', bodyPadding: 15, defaults: { anchor: '100%', labelAlign: 'top', allowBlank: false },
                         items: [
                             { xtype: 'datefield', name: 'start_datum', fieldLabel: 'Start Date (Inclusive)', format: 'Y-m-d', value: Ext.Date.getFirstDateOfMonth(new Date()) },
                             { xtype: 'datefield', name: 'eind_datum', fieldLabel: 'End Date (Inclusive)', format: 'Y-m-d', value: Ext.Date.getLastDateOfMonth(new Date()) }
                         ],
                         buttons: [
                             { text: 'Generate', formBind: true, ui: 'action', action: 'confirmGenerate' }, // Action for listener
                             { text: 'Cancel', action: 'cancelGenerate' }
                         ]
                     }]
                 }).show();
             },

             createExportWindow: function() { // Changed name slightly
                Ext.create('Ext.window.Window', {
                     title: 'Export Summary to Excel', modal: true, width: 400, layout: 'fit',
                     plugins: 'responsive', responsiveConfig: { 'width < 450': { width: '95%' }, 'width >= 450': { width: 400 } },
                     items: [{
                         xtype: 'form', bodyPadding: 15, defaults: { anchor: '100%', labelAlign: 'top', allowBlank: false },
                         items: [
                             { xtype: 'datefield', name: 'start_datum', fieldLabel: 'Start Date (Inclusive)', format: 'Y-m-d', value: Ext.Date.getFirstDateOfMonth(new Date()) },
                             { xtype: 'datefield', name: 'eind_datum', fieldLabel: 'End Date (Inclusive)', format: 'Y-m-d', value: Ext.Date.getLastDateOfMonth(new Date()) }
                         ],
                         buttons: [
                             { text: 'Export', formBind: true, ui: 'action', action: 'confirmExport' }, // Action for listener
                             { text: 'Cancel', action: 'cancelExport' }
                         ]
                     }]
                 }).show();
             }


        }); // End Controller Definition


        // --- Main Viewport ---
        Ext.create('Ext.container.Viewport', {
            layout: 'fit',
            items: [{
                xtype: 'tabpanel',
                plugins: 'responsive', // Add responsive plugin to tabpanel too
                responsiveConfig: {
                    'width < 768': { tabPosition: 'bottom' },
                    'width >= 768': { tabPosition: 'top' }
                },
                items: [ // These grid definitions could be moved to separate view files
                    { // Clients Grid Panel Definition
                         title: 'Clients',
                         xtype: 'gridpanel',
                         store: 'clients', // Reference store by ID
                         plugins: ['responsive'], // Use responsive plugin
                         responsiveConfig: {
                             'width < 600': { hideHeaders: true },
                             'width >= 600': { hideHeaders: false }
                         },
                         columns: [
                             { text: 'Name', dataIndex: 'naam', flex: 2, minWidth: 150 },
                             { text: 'Address', dataIndex: 'adres', flex: 3, hidden: true, responsiveConfig: { 'width >= 768': { hidden: false } } },
                             { text: 'Postcode', dataIndex: 'postcode', flex: 1, hidden: true, responsiveConfig: { 'width >= 768': { hidden: false } } },
                             { text: 'City', dataIndex: 'plaats', flex: 1 },
                             { text: 'Phone', dataIndex: 'telefoon', flex: 1, hidden: true, responsiveConfig: { 'width >= 992': { hidden: false } } },
                             { text: 'Email', dataIndex: 'email', flex: 2, hidden: true, responsiveConfig: { 'width >= 992': { hidden: false } } }
                         ],
                         dockedItems: [{
                             xtype: 'toolbar', dock: 'top',
                             items: [ // Buttons handled by controller
                                 { text: 'Add Client', iconCls: 'x-fa fa-plus' },
                                 { text: 'Edit Client', iconCls: 'x-fa fa-pencil', bind: { disabled: '{!clientGrid.selection}'} },
                                 { text: 'Delete Client', iconCls: 'x-fa fa-trash', bind: { disabled: '{!clientGrid.selection}'} }
                             ]
                         }],
                          reference: 'clientGrid', // Reference for binding/controller
                          selModel: 'rowmodel' // Allow single row selection
                    },
                    { // Treatments Grid Panel Definition
                        title: 'Treatments',
                        xtype: 'gridpanel',
                        store: 'treatments',
                        plugins: ['responsive', 'gridfilters'], // Add filtering plugin instance
                        features: [{ftype:'grouping', groupHeaderTpl: 'Client: {name} ({rows.length})'}], // Grouping
                        columns: [ // Simplified column definitions (renderer etc. still useful)
                            { text: 'Date', dataIndex: 'datum', xtype: 'datecolumn', format: 'Y-m-d', width: 120, filter: { type: 'date'} },
                            { text: 'Client', dataIndex: 'client_naam', flex: 2, filter: { type: 'string'} },
                            { text: 'Treatment', dataIndex: 'behandeling_type_naam', flex: 3, filter: { type: 'list', options: [] } }, // Filter options could be loaded dynamically
                            { text: 'Hours', dataIndex: 'aantal_uren', width: 80, align: 'right', renderer: function(v, m, rec){ return rec.get('prijs_type') === 'per_uur' ? Ext.util.Format.number(v,'0.00') : '-'; }, filter: { type: 'numeric'} },
                            { text: 'Price Type', dataIndex: 'prijs_type', width: 100, filter: { type: 'list', options: ['per_uur', 'per_sessie']}},
                            { text: 'Price', dataIndex: 'prijs', xtype: 'numbercolumn', format: '€0.00', width: 90, align: 'right', filter: { type: 'numeric'}},
                            { text: 'Amount', xtype: 'numbercolumn', format: '€0.00', width: 100, align: 'right', filter: { type: 'numeric'}, renderer: function(v, m, rec) { var p=rec.get('prijs')||0; var h=rec.get('aantal_uren')||0; return Ext.util.Format.currency(rec.get('prijs_type')==='per_uur'?(p*h):p,'€',2); }},
                            { text: 'Invoiced', dataIndex: 'gefactureerd', xtype: 'booleancolumn', trueText: 'Yes', falseText: 'No', width: 90, filter: { type: 'boolean'} },
                            { text: 'Invoice ID', dataIndex: 'factuur_id', width: 100, filter: { type: 'numeric'} }
                        ],
                        dockedItems: [
                            { xtype: 'toolbar', dock: 'top', items: [
                                { text: 'Add Treatment', iconCls: 'x-fa fa-plus' },
                                { text: 'Edit Treatment', iconCls: 'x-fa fa-pencil', bind: { disabled: '{!treatmentGrid.selection || treatmentGrid.selection.gefactureerd}'} },
                                { text: 'Delete Treatment', iconCls: 'x-fa fa-trash', bind: { disabled: '{!treatmentGrid.selection || treatmentGrid.selection.gefactureerd}'} }
                            ]},
                            { xtype: 'pagingtoolbar', store: 'treatments', dock: 'bottom', displayInfo: true }
                        ],
                          reference: 'treatmentGrid',
                          selModel: 'rowmodel'
                    },
                     { // Invoices Grid Panel Definition
                         title: 'Invoices',
                         xtype: 'gridpanel',
                         store: 'invoices',
                         plugins: ['responsive', 'gridfilters'],
                         columns: [
                             { text: 'Invoice #', dataIndex: 'factuur_nummer', width: 150, filter: { type: 'string'} },
                             { text: 'Date', dataIndex: 'datum', xtype: 'datecolumn', format: 'Y-m-d', width: 120, filter: { type: 'date'} },
                             { text: 'Client', dataIndex: 'client_naam', flex: 2, filter: { type: 'string'} },
                             { text: 'Period Start', dataIndex: 'start_datum', xtype: 'datecolumn', format: 'Y-m-d', width: 120, hidden: true, responsiveConfig: { 'width >= 768': { hidden: false } }, filter: { type: 'date'} },
                             { text: 'Period End', dataIndex: 'eind_datum', xtype: 'datecolumn', format: 'Y-m-d', width: 120, hidden: true, responsiveConfig: { 'width >= 768': { hidden: false } }, filter: { type: 'date'} },
                             { text: 'Total Amount', dataIndex: 'totaal_bedrag', xtype: 'numbercolumn', format: '€0.00', width: 130, align: 'right', filter: { type: 'numeric'} },
                             { text: 'Paid', dataIndex: 'betaald', xtype: 'booleancolumn', trueText: 'Yes', falseText: 'No', width: 80, filter: { type: 'boolean'} }
                         ],
                         dockedItems: [
                             { xtype: 'toolbar', dock: 'top', items: [
                                 { text: 'Generate Invoices', iconCls: 'x-fa fa-cogs' },
                                 { text: 'View PDF', iconCls: 'x-fa fa-file-pdf-o', bind: { disabled: '{!invoiceGrid.selection}'} },
                                 { text: 'Mark as Paid', iconCls: 'x-fa fa-check-square-o', bind: { disabled: '{!invoiceGrid.selection || invoiceGrid.selection.betaald}'} },
                                 '->',
                                 { text: 'Export Summary', iconCls: 'x-fa fa-file-excel-o' }
                             ]},
                              { xtype: 'pagingtoolbar', store: 'invoices', dock: 'bottom', displayInfo: true }
                         ],
                         reference: 'invoiceGrid',
                          selModel: 'rowmodel'
                     },
                     { // Treatment Types Grid Panel Definition
                        title: 'Treatment Types',
                        xtype: 'gridpanel',
                        store: 'treatmentTypes',
                        plugins: ['responsive'],
                        columns: [
                            { text: 'Name', dataIndex: 'naam', flex: 2 },
                            { text: 'Description', dataIndex: 'beschrijving', flex: 3, hidden: true, responsiveConfig: { 'width >= 768': { hidden: false } } },
                            { text: 'Price', dataIndex: 'prijs', xtype: 'numbercolumn', format: '€0.00', width: 100, align: 'right' },
                            { text: 'Price Type', dataIndex: 'prijs_type', width: 120 }
                        ],
                        dockedItems: [{ xtype: 'toolbar', dock: 'top', items: [
                            { text: 'Add Type', iconCls: 'x-fa fa-plus' },
                            { text: 'Edit Type', iconCls: 'x-fa fa-pencil', bind: { disabled: '{!treatmentTypeGrid.selection}'} },
                            { text: 'Delete Type', iconCls: 'x-fa fa-trash', bind: { disabled: '{!treatmentTypeGrid.selection}'} }
                        ]}],
                          reference: 'treatmentTypeGrid',
                          selModel: 'rowmodel'
                    }
                ]
            }]
        });

    } // End Launch function

}); // End Application definition

// Define a basic Application class (required by extend: 'Ext.app.Application')
// This was defined earlier, ensure it's not duplicated.

Ext.define('BillingApp.Application', {
    extend: 'Ext.app.Application',
    name: 'BillingApp',
    controllers: [ // Load the controller
        'Main'
    ]
});

