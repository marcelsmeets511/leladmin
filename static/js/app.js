// static/js/app.js
Ext.application({
    name: 'BillingApp',
    extend: 'Ext.app.Application',
  /*
    // --- Explicitly require necessary classes ---
    requires: [
        'Ext.container.Viewport',
        'Ext.tab.Panel',
        'Ext.grid.Panel',
        'Ext.grid.filters.Filters',     // Grid filters plugin
        'Ext.grid.feature.Grouping',    // Grid grouping feature
        'Ext.grid.column.Date',         // Date column
        'Ext.grid.column.Number',       // Number column
        'Ext.grid.column.Boolean',      // Boolean column
        'Ext.window.Window',
        'Ext.form.Panel',
        'Ext.form.field.*',             // Include all form field types
        'Ext.layout.container.Fit',     // Fit layout for windows/viewport
        'Ext.data.Store',
        'Ext.data.Model',
        'Ext.data.proxy.Ajax',
        'Ext.data.reader.Json',
        'Ext.data.writer.Json',
        'Ext.toolbar.Paging',           // Paging toolbar
        'Ext.button.Button',
        'Ext.Date',
        'Ext.MessageBox'
    ],
*/
    // --- Define Models ---
    models: {
        Client: Ext.define('BillingApp.model.Client', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [
                { name: 'id', type: 'int', useNull: true },
                { name: 'naam', type: 'string' },
                { name: 'adres', type: 'string' },
                { name: 'postcode', type: 'string' },
                { name: 'plaats', type: 'string' },
                { name: 'telefoon', type: 'string' },
                { name: 'email', type: 'string' }
            ],
            proxy: {
                type: 'ajax',
                api: { // Use 'api' for different URLs per action
                    create: '/api/clienten',
                    read: '/api/clienten',
                    update: '/api/clienten', // Assumes PUT to /api/clienten/{id} is handled by backend
                    destroy: '/api/clienten' // Assumes DELETE to /api/clienten/{id} is handled by backend
                },
                 url: '/api/clienten', // Default URL if api isn't specific enough
                 actionMethods: { create : 'POST', read : 'GET', update : 'PUT', destroy: 'DELETE' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success' },
                writer: { type: 'json', writeAllFields: true, encode: true, rootProperty: '' }, // Send as single object
                appendId: true, // Important: Append ID to URL for update/destroy (e.g., /api/clienten/123)
                listeners: { /* ... keep your exception listener ... */
                    exception: function(proxy, response, operation) {
                         var errorMsg = 'Server Error (' + operation.action + ')';
                        try {
                            var responseData = Ext.decode(response.responseText);
                            errorMsg = responseData.error || ('Status: ' + response.status + ' - ' + response.statusText);
                        } catch (e) { errorMsg = 'Status: ' + response.status + ' - ' + response.statusText; }
                        Ext.Msg.alert('Client Operation Failed', errorMsg);
                        if (operation.getRecords()) { Ext.each(operation.getRecords(), function(record){ if (record && record.reject) record.reject(); }); }
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
                { name: 'prijs_type', type: 'string' } // 'per_uur', 'per_sessie'
            ],
             proxy: {
                type: 'ajax',
                api: { create: '/api/behandelingen_types', read: '/api/behandelingen_types', update: '/api/behandelingen_types', destroy: '/api/behandelingen_types' },
                url: '/api/behandelingen_types',
                actionMethods: { create : 'POST', read : 'GET', update : 'PUT', destroy: 'DELETE' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success' },
                writer: { type: 'json', writeAllFields: true, encode: true, rootProperty: '' },
                 appendId: true,
                listeners: { /* ... keep your exception listener ... */
                    exception: function(proxy, response, operation) {
                         var errorMsg = 'Server Error (' + operation.action + ')';
                        try { var responseData = Ext.decode(response.responseText); errorMsg = responseData.error || ('Status: ' + response.status + ' - ' + response.statusText); } catch (e) { errorMsg = 'Status: ' + response.status + ' - ' + response.statusText; }
                        Ext.Msg.alert('Treatment Type Operation Failed', errorMsg);
                         if (operation.getRecords()) { Ext.each(operation.getRecords(), function(record){ if (record && record.reject) record.reject(); }); }
                    }
                }
            }
        }),

        Treatment: Ext.define('BillingApp.model.Treatment', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [
                { name: 'id', type: 'int', useNull: true },
                { name: 'client_id', type: 'int', reference: 'Client' },
                { name: 'behandeling_type_id', type: 'int', reference: 'TreatmentType' },
                { name: 'datum', type: 'date', dateFormat: 'Y-m-d' },
                { name: 'aantal_uren', type: 'float', useNull: true },
                { name: 'gefactureerd', type: 'boolean', defaultValue: false },
                { name: 'factuur_id', type: 'int', useNull: true, reference: 'Invoice'},
                // Read-only fields from backend joins
                { name: 'client_naam', type: 'string', mapping: 'clienten.naam', persist: false },
                { name: 'behandeling_type_naam', type: 'string', mapping: 'behandelingen_types.naam', persist: false },
                { name: 'prijs_type', type: 'string', mapping: 'behandelingen_types.prijs_type', persist: false},
                { name: 'prijs', type: 'float', mapping: 'behandelingen_types.prijs', persist: false}
            ],
            proxy: {
                type: 'ajax',
                api: { create: '/api/behandelingen', read: '/api/behandelingen', update: '/api/behandelingen', destroy: '/api/behandelingen' },
                url: '/api/behandelingen',
                actionMethods: { create : 'POST', read : 'GET', update : 'PUT', destroy: 'DELETE' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success', totalProperty: 'totalCount' }, // Need totalProperty for paging if reading list
                writer: { type: 'json', writeAllFields: false, dateFormat: 'Y-m-d', encode: true, rootProperty: '' }, // Don't write persist:false fields
                appendId: true,
                listeners: { /* ... keep your exception listener ... */
                    exception: function(proxy, response, operation) {
                        var errorMsg = 'Server Error (' + operation.action + ')';
                        try { var responseData = Ext.decode(response.responseText); errorMsg = responseData.error || ('Status: ' + response.status + ' - ' + response.statusText); } catch (e) { errorMsg = 'Status: ' + response.status + ' - ' + response.statusText; }
                        Ext.Msg.alert('Treatment Operation Failed', errorMsg);
                         if (operation.getRecords()) { Ext.each(operation.getRecords(), function(record){ if (record && record.reject) record.reject(); }); }
                    }
                 }
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
                { name: 'betaald', type: 'boolean', defaultValue: false },
                { name: 'client_naam', type: 'string', mapping: 'clienten.naam', persist: false }
            ],
            // Proxy primarily for reading the list. Other actions via custom Ajax calls.
            proxy: {
                type: 'ajax',
                url: '/api/facturen',
                actionMethods: { read : 'GET' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success', totalProperty: 'totalCount' },
                listeners: { /* ... keep your exception listener ... */
                    exception: function(proxy, response, operation) {
                        var errorMsg = 'Server Error (' + operation.action + ')';
                         try { var responseData = Ext.decode(response.responseText); errorMsg = responseData.error || ('Status: ' + response.status + ' - ' + response.statusText); } catch (e) { errorMsg = 'Status: ' + response.status + ' - ' + response.statusText; }
                        Ext.Msg.alert('Invoice Operation Failed', errorMsg);
                    }
                 }
            }
        })
    },

    // --- Define Stores ---
    stores: {
        // Clients Store
        clients: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.Client',
            storeId: 'clients', // Explicit storeId is good practice
            autoLoad: true,
            remoteSort: false,
            sorters: [{ property: 'naam', direction: 'ASC' }]
            // Uses model's proxy
        }),

        // Treatment Types Store
        treatmentTypes: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.TreatmentType',
            storeId: 'treatmentTypes',
            autoLoad: true,
            remoteSort: false,
            sorters: [{ property: 'naam', direction: 'ASC' }]
            // Uses model's proxy
        }),

        // Treatments Store (Paged)
        treatments: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.Treatment',
            storeId: 'treatments',
            autoLoad: true,
            remoteSort: true, // Server handles sorting
            remoteFilter: true, // Server handles filtering
            sorters: [{ property: 'datum', direction: 'DESC' }],
            groupField: 'client_naam', // Default grouping
            pageSize: 50, // Enable paging
            // Override proxy for store-specific needs (like reading lists with paging)
            proxy: {
                type: 'ajax',
                url: '/api/behandelingen', // Read URL
                 actionMethods: { read : 'GET' }, // Only need read for store loading
                reader: {
                    type: 'json',
                    rootProperty: '', // Data is the root array
                    totalProperty: 'totalCount', // Backend must supply this for paging
                    successProperty: 'success'
                },
                 listeners: { /* ... Reuse exception listener if needed ... */ }
            }
        }),

        // Invoices Store (Paged)
        invoices: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.Invoice',
            storeId: 'invoices',
            autoLoad: true,
            remoteSort: true,
            remoteFilter: true,
            sorters: [{ property: 'datum', direction: 'DESC' }],
            pageSize: 50,
            // Override proxy for store-specific needs
            proxy: {
                type: 'ajax',
                url: '/api/facturen', // Read URL
                 actionMethods: { read : 'GET' },
                reader: {
                    type: 'json',
                    rootProperty: '',
                    totalProperty: 'totalCount',
                    successProperty: 'success'
                },
                 listeners: { /* ... Reuse exception listener if needed ... */ }
            }
        })
    },

    // --- Define Controllers ---
    // List controller names. Assumes BillingApp.controller.Main is defined below
    // or in a separate file app/controller/Main.js
    controllers: [
        'Main'
    ],

    // --- Application Launch ---
    launch: function () {
        // Hide loading mask (assuming you have one in your index.html)
        var loadingMask = Ext.get('loading-mask');
        if (loadingMask) {
            loadingMask.fadeOut({ duration: 500, remove: true });
        }

        // --- Create the Main User Interface ---
        Ext.create('Ext.container.Viewport', {
            layout: 'fit',
            items: [{
                xtype: 'tabpanel',
                itemId: 'mainTabs', // Add an itemId for easier reference if needed
                activeTab: 0,       // Start on the first tab
                items: [
                    // Client Grid Panel
                    {
                        xtype: 'gridpanel',
                        itemId: 'clientGrid', // Use itemId for controller ref
                        title: 'Clients',
                        store: 'clients', // ** LINK GRID TO STORE **
                        columns: [
                            { text: 'ID', dataIndex: 'id', width: 50 },
                            { text: 'Name', dataIndex: 'naam', flex: 1 },
                            { text: 'Address', dataIndex: 'adres', flex: 1.5 },
                            { text: 'Postcode', dataIndex: 'postcode', width: 80 },
                            { text: 'City', dataIndex: 'plaats', flex: 1 },
                            { text: 'Phone', dataIndex: 'telefoon', flex: 1 },
                            { text: 'Email', dataIndex: 'email', flex: 1.5 }
                        ],
                        dockedItems: [{
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                { text: 'Add Client', action: 'addClient' }, // Use action for controller
                                { text: 'Edit Client', action: 'editClient', bind: { disabled: '{!clientGrid.selection}'} }, // Disable if nothing selected
                                { text: 'Delete Client', action: 'deleteClient', bind: { disabled: '{!clientGrid.selection}'} }
                            ]
                        }]
                    },
                    // Treatment Types Grid Panel
                    {
                        xtype: 'gridpanel',
                        itemId: 'treatmentTypeGrid',
                        title: 'Treatment Types',
                        store: 'treatmentTypes', // ** LINK GRID TO STORE **
                        columns: [
                             { text: 'ID', dataIndex: 'id', width: 50 },
                             { text: 'Name', dataIndex: 'naam', flex: 1 },
                             { text: 'Description', dataIndex: 'beschrijving', flex: 2 },
                             { text: 'Price', dataIndex: 'prijs', xtype: 'numbercolumn', format:'0.00', align: 'right', width: 90 },
                             { text: 'Price Type', dataIndex: 'prijs_type', width: 100 } // e.g., 'per_uur'
                        ],
                        dockedItems: [{
                            xtype: 'toolbar', dock: 'top',
                            items: [
                                { text: 'Add Type', action: 'addType' },
                                { text: 'Edit Type', action: 'editType', bind: { disabled: '{!treatmentTypeGrid.selection}'} },
                                { text: 'Delete Type', action: 'deleteType', bind: { disabled: '{!treatmentTypeGrid.selection}'} }
                            ]
                        }]
                    },
                    // Treatments Grid Panel (Paged, Grouped, Filtered)
                    {
                        xtype: 'gridpanel',
                        itemId: 'treatmentGrid',
                        title: 'Treatments',
                        store: 'treatments', // ** LINK GRID TO STORE **
                        plugins: [ 'gridfilters' ], // Enable filters plugin
                        features: [{ ftype: 'grouping', groupHeaderTpl: '{name} ({rows.length})' }], // Enable grouping
                        columns: [
                            // Grouping column often hidden if groupField is set on store
                            // { text: 'Client', dataIndex: 'client_naam', filter: 'string', hidden: true }, // Example filter
                            { text: 'ID', dataIndex: 'id', width: 50 },
                            { text: 'Client', dataIndex: 'client_naam', filter: 'string', flex: 1.5 }, // Added filter
                            { text: 'Type', dataIndex: 'behandeling_type_naam', filter: 'string', flex: 1.5 },
                            { text: 'Date', dataIndex: 'datum', xtype: 'datecolumn', format: 'Y-m-d', filter: 'date', width: 110 }, // Added filter
                            { text: 'Hours', dataIndex: 'aantal_uren', xtype: 'numbercolumn', format:'0.00', align: 'right', width: 70, filter: 'number'},
                            { text: 'Invoiced', dataIndex: 'gefactureerd', xtype: 'booleancolumn', trueText: 'Yes', falseText: 'No', filter: 'boolean', width: 90 } // Added filter
                           // { text: 'Invoice ID', dataIndex: 'factuur_id', width: 90, filter: 'number' } // Optional
                        ],
                         dockedItems: [{
                            xtype: 'toolbar', dock: 'top',
                            items: [
                                { text: 'Add Treatment', action: 'addTreatment' },
                                { text: 'Edit Treatment', action: 'editTreatment', bind: { disabled: '{!treatmentGrid.selection}'} },
                                { text: 'Delete Treatment', action: 'deleteTreatment', bind: { disabled: '{!treatmentGrid.selection}'} },
                                '->', // Right align following items
                                { text: 'Clear Grouping', handler: function(btn){ btn.up('grid').getStore().clearGrouping(); } }
                            ]
                         }],
                         // Paging Toolbar
                         bbar: {
                            xtype: 'pagingtoolbar',
                            store: 'treatments', // ** LINK PAGING TOOLBAR TO STORE **
                            displayInfo: true,
                            displayMsg: 'Treatments {0} - {1} of {2}',
                            emptyMsg: "No treatments found"
                        }
                    },
                    // Invoices Grid Panel (Paged, Filtered)
                    {
                         xtype: 'gridpanel',
                         itemId: 'invoiceGrid',
                         title: 'Invoices',
                         store: 'invoices', // ** LINK GRID TO STORE **
                         plugins: [ 'gridfilters' ],
                         columns: [
                             { text: 'ID', dataIndex: 'id', width: 50 },
                             { text: 'Invoice #', dataIndex: 'factuur_nummer', filter: 'string', width: 120 },
                             { text: 'Client', dataIndex: 'client_naam', filter: 'string', flex: 1.5 },
                             { text: 'Date', dataIndex: 'datum', xtype: 'datecolumn', format: 'Y-m-d', filter: 'date', width: 110 },
                             { text: 'Period Start', dataIndex: 'start_datum', xtype: 'datecolumn', format: 'Y-m-d', filter: 'date', width: 110 },
                             { text: 'Period End', dataIndex: 'eind_datum', xtype: 'datecolumn', format: 'Y-m-d', filter: 'date', width: 110 },
                             { text: 'Total Amount', dataIndex: 'totaal_bedrag', xtype: 'numbercolumn', format:'€ 0.00', align: 'right', filter:'number', width: 120 },
                             { text: 'Paid', dataIndex: 'betaald', xtype: 'booleancolumn', trueText: 'Yes', falseText: 'No', filter: 'boolean', width: 70 }
                         ],
                         dockedItems: [{
                            xtype: 'toolbar', dock: 'top',
                            items: [
                                { text: 'Generate Invoices', action: 'generateInvoices' },
                                { text: 'View PDF', action: 'viewPdf', bind: { disabled: '{!invoiceGrid.selection}'} },
                                { text: 'Mark as Paid/Unpaid', action: 'togglePaid', bind: { disabled: '{!invoiceGrid.selection}'} },
                                { text: 'Export Summary', action: 'exportSummary' }
                            ]
                         }],
                         // Paging Toolbar
                         bbar: {
                            xtype: 'pagingtoolbar',
                            store: 'invoices', // ** LINK PAGING TOOLBAR TO STORE **
                            displayInfo: true,
                            displayMsg: 'Invoices {0} - {1} of {2}',
                            emptyMsg: "No invoices found"
                        }
                    }
                ]
            }]
        });
    } // End Launch
}); // End Application


// --- Define Controller (Usually in app/controller/Main.js) ---
Ext.define('BillingApp.controller.Main', {
    extend: 'Ext.app.Controller',

    // --- References to Components ---
    refs: [
        // Use itemId for better reliability
        { ref: 'clientGrid', selector: '#clientGrid' },
        { ref: 'treatmentGrid', selector: '#treatmentGrid' },
        { ref: 'invoiceGrid', selector: '#invoiceGrid' },
        { ref: 'treatmentTypeGrid', selector: '#treatmentTypeGrid' },
        // Window refs are less common unless you need persistent access
        // Form refs often target the form within the active window
        { ref: 'clientForm', selector: 'window[itemId=clientWindow] form' },
        { ref: 'treatmentForm', selector: 'window[itemId=treatmentWindow] form' },
        { ref: 'treatmentTypeForm', selector: 'window[itemId=treatmentTypeWindow] form' },
        { ref: 'generateInvoiceForm', selector: 'window[itemId=generateInvoiceWindow] form' },
        { ref: 'exportForm', selector: 'window[itemId=exportWindow] form' }
        // Ref for hours field can be tricky, better to find via form reference:
        // { ref: 'hoursField', selector: 'window[itemId=treatmentWindow] numberfield[name=aantal_uren]'}
    ],

    // --- Initialize Controller and Set Listeners ---
    init: function() {
        this.control({
            // Grid Buttons (using action property)
            '#clientGrid button[action=addClient]': { click: this.onAddClientClick },
            '#clientGrid button[action=editClient]': { click: this.onEditClientClick },
            '#clientGrid button[action=deleteClient]': { click: this.onDeleteClientClick },
            '#clientGrid': { itemdblclick: this.onEditClientClick }, // Edit on double click

            '#treatmentTypeGrid button[action=addType]': { click: this.onAddTreatmentTypeClick },
            '#treatmentTypeGrid button[action=editType]': { click: this.onEditTreatmentTypeClick },
            '#treatmentTypeGrid button[action=deleteType]': { click: this.onDeleteTreatmentTypeClick },
            '#treatmentTypeGrid': { itemdblclick: this.onEditTreatmentTypeClick },

            '#treatmentGrid button[action=addTreatment]': { click: this.onAddTreatmentClick },
            '#treatmentGrid button[action=editTreatment]': { click: this.onEditTreatmentClick },
            '#treatmentGrid button[action=deleteTreatment]': { click: this.onDeleteTreatmentClick },
            '#treatmentGrid': { itemdblclick: this.onTreatmentItemDblClick },

            '#invoiceGrid button[action=generateInvoices]': { click: this.onGenerateInvoicesClick },
            '#invoiceGrid button[action=viewPdf]': { click: this.onViewInvoicePdfClick },
            '#invoiceGrid button[action=togglePaid]': { click: this.onTogglePaidClick }, // Changed action name
            '#invoiceGrid button[action=exportSummary]': { click: this.onExportClick },
            '#invoiceGrid': { itemdblclick: this.onViewInvoicePdfClick }, // Double click to view PDF

            // Window Buttons (using itemId for windows)
            'window[itemId=clientWindow] button[action=save]': { click: this.onSaveClient },
            'window[itemId=clientWindow] button[action=cancel]': { click: this.closeWindow },
            'window[itemId=treatmentTypeWindow] button[action=save]': { click: this.onSaveTreatmentType },
            'window[itemId=treatmentTypeWindow] button[action=cancel]': { click: this.closeWindow },
            'window[itemId=treatmentWindow] button[action=save]': { click: this.onSaveTreatment },
            'window[itemId=treatmentWindow] button[action=cancel]': { click: this.closeWindow },
            'window[itemId=generateInvoiceWindow] button[action=generate]': { click: this.onConfirmGenerateInvoices },
            'window[itemId=generateInvoiceWindow] button[action=cancel]': { click: this.closeWindow },
            'window[itemId=exportWindow] button[action=export]': { click: this.onConfirmExport },
            'window[itemId=exportWindow] button[action=cancel]': { click: this.closeWindow },

             // Form field listeners (within the specific window)
             'window[itemId=treatmentWindow] combobox[name=behandeling_type_id]': { select: this.onTreatmentTypeSelect }
        });
    },

    // --- Helper Functions ---
    closeWindow: function(button) {
        button.up('window').close();
    },

    // Generic function to get selected record from a grid using its ref getter
    getSelectedRecord: function(gridRefName) {
        var getterName = 'get' + Ext.String.capitalize(gridRefName); // e.g., getClientGrid
        if (this[getterName]) {
             var grid = this[getterName]();
             if (grid) {
                var selection = grid.getSelectionModel().getSelection();
                return selection.length > 0 ? selection[0] : null;
             }
        }
        console.warn('Could not find grid for ref:', gridRefName);
        return null;
    },

    // --- Window Creation Functions ---

    createClientWindow: function(record) {
        var isEdit = !!record; // Check if we are editing
        var window = Ext.create('Ext.window.Window', {
            title: isEdit ? 'Edit Client: ' + record.get('naam') : 'Add New Client',
            itemId: 'clientWindow', // Use itemId
            modal: true,
            width: 500,
            layout: 'fit',
            items: [{
                xtype: 'form',
                bodyPadding: 10,
                defaults: { anchor: '100%' },
                items: [
                    { xtype: 'hiddenfield', name: 'id' }, // Hidden field for ID on edit
                    { xtype: 'textfield', name: 'naam', fieldLabel: 'Name', allowBlank: false },
                    { xtype: 'textfield', name: 'adres', fieldLabel: 'Address' },
                    { xtype: 'textfield', name: 'postcode', fieldLabel: 'Postcode' },
                    { xtype: 'textfield', name: 'plaats', fieldLabel: 'City' },
                    { xtype: 'textfield', name: 'telefoon', fieldLabel: 'Phone' },
                    { xtype: 'textfield', name: 'email', fieldLabel: 'Email', vtype: 'email' }
                ]
            }],
            buttons: [
                { text: 'Save', action: 'save' },
                { text: 'Cancel', action: 'cancel' }
            ]
        });

        if (isEdit) {
            window.down('form').loadRecord(record); // Load data if editing
        }
        window.show();
    },

     createTreatmentTypeWindow: function(record) {
         var isEdit = !!record;
        var window = Ext.create('Ext.window.Window', {
            title: isEdit ? 'Edit Treatment Type: ' + record.get('naam') : 'Add New Treatment Type',
            itemId: 'treatmentTypeWindow',
            modal: true,
            width: 500,
            layout: 'fit',
            items: [{
                xtype: 'form',
                bodyPadding: 10,
                 defaults: { anchor: '100%' },
                items: [
                    { xtype: 'hiddenfield', name: 'id' },
                    { xtype: 'textfield', name: 'naam', fieldLabel: 'Name', allowBlank: false },
                    { xtype: 'textareafield', name: 'beschrijving', fieldLabel: 'Description' },
                    { xtype: 'numberfield', name: 'prijs', fieldLabel: 'Price', allowBlank: false, decimalPrecision: 2, minValue: 0 },
                    { xtype: 'combobox', name: 'prijs_type', fieldLabel: 'Price Type', allowBlank: false,
                      store: ['per_uur', 'per_sessie'], // Simple store for options
                      forceSelection: true
                    }
                ]
            }],
            buttons: [ { text: 'Save', action: 'save' }, { text: 'Cancel', action: 'cancel' } ]
        });
         if (isEdit) { window.down('form').loadRecord(record); }
        window.show();
    },

     createTreatmentWindow: function(record) {
         var isEdit = !!record;
        var window = Ext.create('Ext.window.Window', {
            title: isEdit ? 'Edit Treatment' : 'Add New Treatment',
            itemId: 'treatmentWindow',
            modal: true,
            width: 550,
            layout: 'fit',
            items: [{
                xtype: 'form',
                bodyPadding: 10,
                 defaults: { anchor: '100%' },
                items: [
                    { xtype: 'hiddenfield', name: 'id' },
                    { xtype: 'combobox', name: 'client_id', fieldLabel: 'Client', allowBlank: false,
                      store: 'clients', // Reference the store
                      displayField: 'naam',
                      valueField: 'id',
                      queryMode: 'local', // Assuming clients are loaded
                      forceSelection: true
                    },
                    { xtype: 'combobox', name: 'behandeling_type_id', fieldLabel: 'Treatment Type', allowBlank: false,
                      store: 'treatmentTypes',
                      displayField: 'naam',
                      valueField: 'id',
                       queryMode: 'local',
                      forceSelection: true,
                       listeners: {
                           // Moved select listener here for better scoping if needed,
                           // but controller listener should also work.
                           // select: this.onTreatmentTypeSelect // Controller handles this
                       }
                    },
                    { xtype: 'datefield', name: 'datum', fieldLabel: 'Date', allowBlank: false, format: 'Y-m-d', value: new Date() }, // Default to today
                    { xtype: 'numberfield', name: 'aantal_uren', fieldLabel: 'Hours', decimalPrecision: 2, minValue: 0,
                      // Initially disabled, enabled by combobox selection if needed
                      disabled: true, // Start disabled, enable based on type selection
                      allowBlank: true // Allow blank initially and if not per_hour
                    },
                    // gefactureerd and factuur_id are usually set by backend logic, not user form
                ]
            }],
            buttons: [ { text: 'Save', action: 'save' }, { text: 'Cancel', action: 'cancel' } ]
        });
         if (isEdit) {
             window.down('form').loadRecord(record);
             // Manually trigger select logic after load to set hours field state correctly
             var typeCombo = window.down('combobox[name=behandeling_type_id]');
             var typeStore = Ext.getStore('treatmentTypes');
             var typeRecord = typeStore.getById(record.get('behandeling_type_id'));
             if (typeRecord) {
                 this.updateHoursFieldState(typeCombo, typeRecord);
             }
         } else {
              // For new records, maybe enable hours if default type is per_hour?
              // Or just leave disabled until type selected.
         }
        window.show();
    },

     createGenerateInvoiceWindow: function() {
        Ext.create('Ext.window.Window', {
            title: 'Generate Invoices',
            itemId: 'generateInvoiceWindow',
            modal: true,
            width: 400,
            layout: 'fit',
            items: [{
                xtype: 'form',
                bodyPadding: 10,
                 defaults: { anchor: '100%' },
                items: [
                    { xtype: 'datefield', name: 'start_datum', fieldLabel: 'Start Date', allowBlank: false, format: 'Y-m-d' },
                    { xtype: 'datefield', name: 'eind_datum', fieldLabel: 'End Date', allowBlank: false, format: 'Y-m-d' },
                    { xtype: 'combobox', name: 'client_id', fieldLabel: 'Client (Optional)',
                      store: 'clients', displayField: 'naam', valueField: 'id', queryMode: 'local',
                      emptyText: 'Leave blank for all clients'
                    }
                ]
            }],
            buttons: [ { text: 'Generate', action: 'generate' }, { text: 'Cancel', action: 'cancel' } ]
        }).show();
    },

     createExportWindow: function() {
        Ext.create('Ext.window.Window', {
            title: 'Export Summary',
            itemId: 'exportWindow',
            modal: true,
            width: 400,
            layout: 'fit',
            items: [{
                xtype: 'form',
                bodyPadding: 10,
                 defaults: { anchor: '100%' },
                items: [
                     { xtype: 'datefield', name: 'start_datum', fieldLabel: 'Start Date', allowBlank: false, format: 'Y-m-d' },
                     { xtype: 'datefield', name: 'eind_datum', fieldLabel: 'End Date', allowBlank: false, format: 'Y-m-d' },
                     { xtype: 'combobox', name: 'export_format', fieldLabel: 'Format', store: ['CSV', 'PDF'], value: 'CSV', allowBlank: false, forceSelection: true }
                 ]
            }],
            buttons: [ { text: 'Export', action: 'export' }, { text: 'Cancel', action: 'cancel' } ]
        }).show();
    },


    // --- Client Event Handlers ---
     onAddClientClick: function() {
         this.createClientWindow();
     },

    onEditClientClick: function() { // Handles button click and grid dblclick
         var record = this.getSelectedRecord('clientGrid');
         if (record) {
             this.createClientWindow(record);
         } else if (!arguments[0].isComponent) { // Don't show msg on grid dblclick with no selection
              Ext.Msg.alert('Selection Error', 'Please select a client to edit.');
         }
     },

     onDeleteClientClick: function() {
         var record = this.getSelectedRecord('clientGrid');
         if (record) {
             Ext.Msg.confirm('Confirm Delete', 'Are you sure you want to delete client "' + record.get('naam') + '"?<br/>This might fail if treatments or invoices reference this client.', function(btn) {
                 if (btn === 'yes') {
                    var store = this.getClientGrid().getStore(); // Get store from grid
                    store.remove(record); // Optimistic removal from UI

                    record.erase({ // DELETE request via proxy
                        success: function(rec, operation) {
                            Ext.toast('Client deleted successfully.', 'Success');
                            // No need to reload store usually after erase
                        },
                        failure: function(rec, operation) {
                            // Error message shown by proxy listener
                            // Rollback UI change
                            store.rejectChanges(); // This might add it back if phantom, or use insert
                            // Or more reliably: store.insert(operation.getInitialRecordData().index || 0, rec); // Re-insert at original position if possible
                             Ext.toast('Failed to delete client.', 'Error');
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
        var form = win.down('form').getForm();
        var record = form.getRecord(); // Get record if editing
        var values = form.getValues();
        var store = this.getClientGrid().getStore(); // Get store via grid ref

        if (form.isValid()) {
             win.setLoading('Saving...');

            if (record) { // Editing existing
                record.set(values); // Update existing record
            } else { // Adding new
                record = Ext.create('BillingApp.model.Client', values);
                store.add(record); // Add to store (will be phantom until saved)
            }

            record.save({
                 callback: function(savedRecord, operation, success) {
                     win.setLoading(false);
                     if (success) {
                        win.close();
                        Ext.toast('Client saved successfully.', 'Success');
                        // store.load(); // Reload only if necessary (e.g., backend calculates fields)
                     } else {
                         // Error shown by proxy listener
                         // If it was a new record add that failed, remove the phantom record
                         if (operation.action === 'create' && !savedRecord.getId()) {
                              store.remove(savedRecord);
                         }
                         // Reject other changes if needed
                         // store.rejectChanges(); // Use carefully
                          Ext.toast('Failed to save client.', 'Error');
                     }
                }
            });
        }
    },

     // --- Treatment Type Handlers ---
     onAddTreatmentTypeClick: function() { this.createTreatmentTypeWindow(); },
     onEditTreatmentTypeClick: function() {
        var record = this.getSelectedRecord('treatmentTypeGrid');
        if (record) { this.createTreatmentTypeWindow(record); }
        else if (!arguments[0].isComponent) { Ext.Msg.alert('Selection Error', 'Please select a treatment type.'); }
     },
     onDeleteTreatmentTypeClick: function() {
        var record = this.getSelectedRecord('treatmentTypeGrid');
        if (record) {
            Ext.Msg.confirm('Confirm Delete', 'Delete type "' + record.get('naam') + '"? <br/>Check usage in Treatments first.', function(btn) {
                if (btn === 'yes') {
                   var store = this.getTreatmentTypeGrid().getStore();
                   store.remove(record);
                    record.erase({
                        success: function() { Ext.toast('Treatment type deleted.'); },
                        failure: function(rec, op) { store.rejectChanges(); Ext.toast('Failed to delete type.'); }
                    });
                }
            }, this);
        } else { Ext.Msg.alert('Selection Error', 'Please select a treatment type.'); }
     },
     onSaveTreatmentType: function(button) {
         var win = button.up('window');
         var form = win.down('form').getForm();
         var record = form.getRecord();
         var values = form.getValues();
         var store = this.getTreatmentTypeGrid().getStore();

         if (form.isValid()) {
             win.setLoading('Saving...');
             if (record) { record.set(values); }
             else { record = Ext.create('BillingApp.model.TreatmentType', values); store.add(record); }

             record.save({
                 callback: function(rec, op, success) {
                      win.setLoading(false);
                      if (success) {
                          win.close(); Ext.toast('Treatment type saved.');
                          // store.load(); // Reload if needed
                      } else {
                           if (op.action === 'create' && !rec.getId()) store.remove(rec);
                           Ext.toast('Failed to save treatment type.');
                      }
                 }
             });
         }
    },


     // --- Treatment Handlers ---
      onAddTreatmentClick: function() { this.createTreatmentWindow(); },
     onEditTreatmentClick: function() {
        var record = this.getSelectedRecord('treatmentGrid');
        if (record) {
            if(record.get('gefactureerd')) { Ext.Msg.alert('Edit Error', 'Cannot edit an invoiced treatment.'); return; }
            this.createTreatmentWindow(record);
        } else if (!arguments[0].isComponent) { Ext.Msg.alert('Selection Error', 'Please select a treatment.'); }
     },
     onTreatmentItemDblClick: function(grid, record) {
         if (!record.get('gefactureerd')) { this.createTreatmentWindow(record); }
         else { Ext.Msg.alert('Edit Error', 'Cannot edit an invoiced treatment.'); }
     },
     onDeleteTreatmentClick: function() {
        var record = this.getSelectedRecord('treatmentGrid');
        if (record) {
             if(record.get('gefactureerd')) { Ext.Msg.alert('Delete Error', 'Cannot delete an invoiced treatment.'); return; }
            Ext.Msg.confirm('Confirm Delete', 'Delete this treatment record?', function(btn) {
                if (btn === 'yes') {
                     var store = this.getTreatmentGrid().getStore();
                     store.remove(record);
                    record.erase({
                        success: function() { Ext.toast('Treatment deleted.'); },
                        failure: function(rec, op) { store.rejectChanges(); Ext.toast('Failed to delete treatment.'); }
                    });
                }
            }, this);
        } else { Ext.Msg.alert('Selection Error', 'Please select a treatment.'); }
     },
     onSaveTreatment: function(button) {
        var win = button.up('window');
        var formPanel = win.down('form'); // Get the form panel
        var form = formPanel.getForm(); // Get the BasicForm
        var record = form.getRecord();
        var values = form.getValues();
        var store = this.getTreatmentGrid().getStore();

        if (form.isValid()) {
            // Format date explicitly
            values.datum = Ext.Date.format(form.findField('datum').getValue(), 'Y-m-d');

            // Handle hours based on type (check associated record)
            var typeStore = Ext.getStore('treatmentTypes');
            var typeRecord = typeStore.getById(parseInt(values.behandeling_type_id));
            var hoursField = form.findField('aantal_uren');
            if (typeRecord && typeRecord.get('prijs_type') !== 'per_uur') {
                values.aantal_uren = null; // Nullify if not per hour
            } else if (hoursField.isDisabled()) {
                 values.aantal_uren = null; // Ensure it's null if field was disabled
            }
             // Validation for hours if type IS per_hour and field is enabled should be handled by allowBlank on field?
             // Or add explicit check here if needed.

             win.setLoading('Saving...');
             if (record) { // Editing
                record.set(values);
             } else { // Adding
                 record = Ext.create('BillingApp.model.Treatment', values);
                  store.add(record);
             }

            record.save({
                callback: function(rec, op, success) {
                    win.setLoading(false);
                     if (success) {
                        win.close();
                        Ext.toast('Treatment saved.');
                        store.load(); // Reload treatments to show joined data correctly & refresh paging
                     } else {
                         if(op.action === 'create' && !rec.getId()) store.remove(rec);
                         Ext.toast('Failed to save treatment.');
                     }
                }
            });
        }
    },

    // Handler for Treatment Type combo selection in Treatment form
    onTreatmentTypeSelect: function(combo, record) {
        // record here is the selected TreatmentType record
        this.updateHoursFieldState(combo, record);
    },

    // Helper to enable/disable hours field
    updateHoursFieldState: function(combo, typeRecord) {
        var form = combo.up('form'); // Find the parent form
         if (!form) return; // Should not happen
         var hoursField = form.down('numberfield[name=aantal_uren]'); // Find hours field within *this* form

         if (hoursField) {
             if (typeRecord && typeRecord.get('prijs_type') === 'per_uur') {
                 hoursField.enable();
                 hoursField.allowBlank = false; // Require hours if per_hour type
             } else {
                 hoursField.disable();
                 hoursField.allowBlank = true; // Not required if not per_hour
                 hoursField.setValue(null);    // Clear value when disabling
             }
              // Trigger validation display update
             hoursField.validate();
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
             win.setLoading('Generating...');

            // *** Add AJAX Call to your backend endpoint ***
            Ext.Ajax.request({
                url: '/api/facturen/generate', // Your backend endpoint
                method: 'POST',
                jsonData: { // Send parameters as JSON
                    start_datum: Ext.Date.format(values.start_datum, 'Y-m-d'),
                    eind_datum: Ext.Date.format(values.eind_datum, 'Y-m-d'),
                    client_id: values.client_id || null // Send null if blank
                },
                success: function(response) {
                    win.setLoading(false);
                    var result = Ext.decode(response.responseText);
                    if (result.success) {
                        win.close();
                        Ext.Msg.alert('Success', result.message || 'Invoices generated successfully.');
                        Ext.getStore('invoices').load(); // Reload invoice grid
                        Ext.getStore('treatments').load(); // Reload treatments grid (status might change)
                    } else {
                        Ext.Msg.alert('Generation Failed', result.error || 'Could not generate invoices.');
                    }
                },
                failure: function(response) {
                     win.setLoading(false);
                     Ext.Msg.alert('Server Error', 'Status: ' + response.status + ' - ' + response.statusText);
                }
            });

         }
    },

    onViewInvoicePdfClick: function() {
        var record = this.getSelectedRecord('invoiceGrid');
        if (record) {
            // Construct URL to fetch PDF - Adapt to your backend setup
            var pdfUrl = '/api/facturen/' + record.get('id') + '/pdf';
            // Open in new tab/window
             window.open(pdfUrl, '_blank');
        } else if (!arguments[0].isComponent) {
            Ext.Msg.alert('Selection Error', 'Please select an invoice to view.');
        }
    },

    onTogglePaidClick: function() {
        var record = this.getSelectedRecord('invoiceGrid');
        if (record) {
            var invoiceId = record.get('id');
            var currentStatus = record.get('betaald');
            var newStatus = !currentStatus;

             Ext.Msg.confirm('Confirm Status Change',
                'Mark invoice ' + record.get('factuur_nummer') + ' as ' + (newStatus ? 'Paid' : 'Unpaid') + '?',
                function(btn) {
                 if (btn === 'yes') {
                    var grid = this.getInvoiceGrid();
                    grid.mask('Updating...'); // Mask grid while saving

                    // *** Add AJAX Call to your backend endpoint ***
                    Ext.Ajax.request({
                        url: '/api/facturen/' + invoiceId + '/status', // Your endpoint
                        method: 'PUT', // Or POST
                        jsonData: { betaald: newStatus },
                        success: function(response) {
                            grid.unmask();
                            var result = Ext.decode(response.responseText);
                            if (result.success) {
                                // Update record in store without full reload
                                record.set('betaald', newStatus);
                                record.commit(); // Mark change as non-dirty
                                Ext.toast('Invoice status updated.');
                            } else {
                                Ext.Msg.alert('Update Failed', result.error || 'Could not update status.');
                                record.reject(); // Revert change in UI
                            }
                        },
                        failure: function(response) {
                             grid.unmask();
                             Ext.Msg.alert('Server Error', 'Status: ' + response.status + ' - ' + response.statusText);
                             record.reject(); // Revert change in UI
                        }
                    });
                 }
             }, this); // Pass controller scope to callback

        } else {
            Ext.Msg.alert('Selection Error', 'Please select an invoice to update.');
        }
    },

    onExportClick: function() {
        this.createExportWindow();
    },

    onConfirmExport: function(button) {
         var win = button.up('window');
         var form = win.down('form').getForm();
          if (form.isValid()) {
              var values = form.getValues();
              // Construct URL with query parameters for export
              var exportUrl = Ext.String.urlAppend('/api/export/summary', Ext.Object.toQueryString({
                  start_datum: Ext.Date.format(values.start_datum, 'Y-m-d'),
                  eind_datum: Ext.Date.format(values.eind_datum, 'Y-m-d'),
                  format: values.export_format
              }));

              // Option 1: Open URL directly (browser handles download)
              // window.open(exportUrl);

              // Option 2: Use Ext.Ajax if backend returns file info or needs headers
              // (More complex, involves handling response potentially)
              Ext.Msg.alert('Export Started', 'Your export will download shortly. URL (for testing):<br>' + exportUrl);
              // Simulate download start
               window.location.href = exportUrl;


              win.close();
          }
    }

}); // End Controller Definition