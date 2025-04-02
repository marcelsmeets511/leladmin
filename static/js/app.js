// static/js/app.js
Ext.application({
    name: 'BillingApp',
    extend: 'Ext.app.Application', // Define a basic Application class

    requires: [
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
        'Ext.MessageBox'
    ],

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
                api: {
                    read: '/api/clienten',
                    create: '/api/clienten',
                    update: '/api/clienten/{id}', // Placeholder, URL adjusted before request
                    destroy: '/api/clienten/{id}' // Placeholder, URL adjusted before request
                },
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
                // Function to build the correct URL for update/delete
                buildUrl: function(request) {
                    var url = this.getUrl(request);
                    if (request.getRecords() && request.getAction() !== 'create') {
                        var recordId = request.getRecords()[0].getId();
                        if (recordId) {
                             url = url.replace('{id}', recordId);
                        } else {
                            // Handle cases where ID might be missing unexpectedly
                            console.error("Cannot build URL: Record ID is missing.");
                            // Maybe throw an error or return a default/invalid URL
                            // Depending on how you want to handle this error case
                            return this.getDefaultUrl(); // Example fallback
                        }
                    }
                    // Set the final URL on the request object
                    request.setUrl(url);
                    // Let the parent buildUrl handle the rest (like adding params)
                    return Ext.data.proxy.Ajax.prototype.buildUrl.call(this, request);
                },
                // Provide a default URL or handle the absence of {id} appropriately
                getDefaultUrl: function() {
                    // Return a base URL or throw an error, depending on your needs
                    // This example returns the base read URL, adjust as necessary
                    return this.api.read || this.url || '';
                },
                listeners: {
                    exception: function(proxy, response, operation) {
                        var errorMsg = 'Server Error';
                        try {
                            var responseData = Ext.decode(response.responseText);
                            errorMsg = responseData.error || 'Unknown error';
                        } catch (e) {
                            // Ignore decode error
                        }
                        Ext.Msg.alert('Error', 'Operation failed: ' + errorMsg + ' (' + operation.action + ')');
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
             proxy: { // Reusing similar proxy structure as Client
                type: 'ajax',
                api: {
                    read: '/api/behandelingen_types',
                    create: '/api/behandelingen_types',
                    update: '/api/behandelingen_types/{id}',
                    destroy: '/api/behandelingen_types/{id}'
                },
                actionMethods: { create : 'POST', read : 'GET', update : 'PUT', destroy: 'DELETE' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success' },
                writer: { type: 'json', writeAllFields: true, encode: true, rootProperty: '' },
                buildUrl: function(request) { /* ... same as Client proxy ... */
                    var url = this.getUrl(request);
                    if (request.getRecords() && request.getAction() !== 'create') {
                        var recordId = request.getRecords()[0].getId();
                        if (recordId) {
                             url = url.replace('{id}', recordId);
                        } else {
                            console.error("Cannot build URL: Record ID is missing.");
                            return this.getDefaultUrl();
                        }
                    }
                    request.setUrl(url);
                    return Ext.data.proxy.Ajax.prototype.buildUrl.call(this, request);
                },
                getDefaultUrl: function() { return this.api.read || this.url || ''; },
                listeners: { exception: function(proxy, response, operation) { /* ... same as Client proxy ... */
                     var errorMsg = 'Server Error';
                        try {
                            var responseData = Ext.decode(response.responseText);
                            errorMsg = responseData.error || 'Unknown error';
                        } catch (e) {}
                        Ext.Msg.alert('Error', 'Operation failed: ' + errorMsg + ' (' + operation.action + ')');
                } }
            }
        }),

        Treatment: Ext.define('BillingApp.model.Treatment', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [
                { name: 'id', type: 'int', useNull: true },
                { name: 'client_id', type: 'int' },
                { name: 'behandeling_type_id', type: 'int' },
                { name: 'datum', type: 'date', dateFormat: 'Y-m-d' }, // Ensure format matches backend
                { name: 'aantal_uren', type: 'float', useNull: true }, // Can be null if price is per session
                { name: 'gefactureerd', type: 'boolean', defaultValue: false },
                { name: 'factuur_id', type: 'int', useNull: true },
                // Fields from related tables (read-only)
                { name: 'client_naam', type: 'string', mapping: 'clienten.naam', persist: false },
                { name: 'behandeling_type_naam', type: 'string', mapping: 'behandelingen_types.naam', persist: false },
                { name: 'prijs_type', type: 'string', mapping: 'behandelingen_types.prijs_type', persist: false},
                { name: 'prijs', type: 'float', mapping: 'behandelingen_types.prijs', persist: false}
            ],
            proxy: { // Reusing similar proxy structure
                type: 'ajax',
                api: {
                    read: '/api/behandelingen',
                    create: '/api/behandelingen',
                    update: '/api/behandelingen/{id}',
                    destroy: '/api/behandelingen/{id}'
                },
                actionMethods: { create : 'POST', read : 'GET', update : 'PUT', destroy: 'DELETE' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success' },
                writer: {
                    type: 'json',
                    writeAllFields: false, // Only send fields that are not persist: false
                    dateFormat: 'Y-m-d', // Send date in correct format
                    encode: true,
                    rootProperty: ''
                 },
                buildUrl: function(request) { /* ... same as Client proxy ... */
                    var url = this.getUrl(request);
                    if (request.getRecords() && request.getAction() !== 'create') {
                        var recordId = request.getRecords()[0].getId();
                        if (recordId) {
                             url = url.replace('{id}', recordId);
                        } else {
                            console.error("Cannot build URL: Record ID is missing.");
                            return this.getDefaultUrl();
                        }
                    }
                    request.setUrl(url);
                    return Ext.data.proxy.Ajax.prototype.buildUrl.call(this, request);
                },
                getDefaultUrl: function() { return this.api.read || this.url || ''; },
                listeners: { exception: function(proxy, response, operation) { /* ... same as Client proxy ... */
                    var errorMsg = 'Server Error';
                        try {
                            var responseData = Ext.decode(response.responseText);
                            errorMsg = responseData.error || 'Unknown error';
                        } catch (e) {}
                        Ext.Msg.alert('Error', 'Operation failed: ' + errorMsg + ' (' + operation.action + ')');
                 } }
            }
        }),

        Invoice: Ext.define('BillingApp.model.Invoice', {
            extend: 'Ext.data.Model',
            idProperty: 'id',
            fields: [
                { name: 'id', type: 'int', useNull: true },
                { name: 'factuur_nummer', type: 'string' },
                { name: 'client_id', type: 'int' },
                { name: 'datum', type: 'date', dateFormat: 'Y-m-d' },
                { name: 'start_datum', type: 'date', dateFormat: 'Y-m-d' },
                { name: 'eind_datum', type: 'date', dateFormat: 'Y-m-d' },
                { name: 'totaal_bedrag', type: 'float' },
                { name: 'betaald', type: 'boolean' },
                 // Fields from related tables (read-only)
                { name: 'client_naam', type: 'string', mapping: 'clienten.naam', persist: false }
            ],
            proxy: { // Read-only proxy for invoices list, actions handled separately
                type: 'ajax',
                url: '/api/facturen',
                actionMethods: { read : 'GET' },
                reader: { type: 'json', rootProperty: '', successProperty: 'success' },
                listeners: { exception: function(proxy, response, operation) { /* ... same as Client proxy ... */
                    var errorMsg = 'Server Error';
                        try {
                            var responseData = Ext.decode(response.responseText);
                            errorMsg = responseData.error || 'Unknown error';
                        } catch (e) {}
                        Ext.Msg.alert('Error', 'Operation failed: ' + errorMsg + ' (' + operation.action + ')');
                } }
            }
        })
    },

    // Define Stores
    stores: {
        clients: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.Client',
            autoLoad: true,
            sorters: [{ property: 'naam', direction: 'ASC' }]
        }),
        treatmentTypes: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.TreatmentType',
            autoLoad: true,
             sorters: [{ property: 'naam', direction: 'ASC' }]
        }),
        treatments: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.Treatment',
            autoLoad: true,
            remoteSort: false, // Perform sorting locally if desired
            sorters: [{ property: 'datum', direction: 'DESC' }],
            groupField: 'client_naam', // Example grouping
             pageSize: 50, // Example paging
             proxy: { // Need proxy here if using paging/remote sort
                 type: 'ajax',
                 url: '/api/behandelingen',
                 reader: { type: 'json', rootProperty: '', totalProperty: 'totalCount' } // Adjust if backend provides total
             }
        }),
        invoices: Ext.create('Ext.data.Store', {
            model: 'BillingApp.model.Invoice',
            autoLoad: true,
            remoteSort: false,
            sorters: [{ property: 'datum', direction: 'DESC' }],
            pageSize: 50, // Example paging
            proxy: { // Need proxy here if using paging/remote sort
                 type: 'ajax',
                 url: '/api/facturen',
                 reader: { type: 'json', rootProperty: '', totalProperty: 'totalCount' } // Adjust if backend provides total
             }
        })
    },

    launch: function () {
        // Hide loading mask
        var loadingMask = Ext.get('loading-mask');
        if (loadingMask) {
            loadingMask.fadeOut({ duration: 500, remove: true });
        }

        // Main Viewport with Responsive Tabs
        Ext.create('Ext.container.Viewport', {
            layout: 'fit', // Fit the tab panel to the viewport
            items: [{
                xtype: 'tabpanel',
                responsiveConfig: {
                    // Switch tab position for smaller screens
                    'width < 768': {
                        tabPosition: 'bottom'
                    },
                    'width >= 768': {
                        tabPosition: 'top'
                    }
                },
                items: [
                    this.createClientsGrid(),
                    this.createTreatmentsGrid(),
                    this.createInvoicesGrid(),
                    this.createTreatmentTypesGrid() // Add management for treatment types
                ]
            }]
        });
    },

    // --- Grid Creation Functions ---

    createClientsGrid: function() {
        return {
            title: 'Clients',
            xtype: 'gridpanel',
            store: 'clients',
            plugins: ['responsive'], // Use responsive plugin
            responsiveConfig: {
                'width < 600': { // Example breakpoint
                    hideHeaders: true // Hide headers on small screens
                },
                'width >= 600': {
                    hideHeaders: false
                }
            },
            columns: [
                { text: 'Name', dataIndex: 'naam', flex: 2, minWidth: 150 },
                { text: 'Address', dataIndex: 'adres', flex: 3, hidden: true, // Initially hidden on smaller screens potentially
                    responsiveConfig: { 'width >= 768': { hidden: false } } // Show on larger screens
                },
                { text: 'Postcode', dataIndex: 'postcode', flex: 1, hidden: true, responsiveConfig: { 'width >= 768': { hidden: false } } },
                { text: 'City', dataIndex: 'plaats', flex: 1 },
                { text: 'Phone', dataIndex: 'telefoon', flex: 1, hidden: true, responsiveConfig: { 'width >= 992': { hidden: false } } }, // Hide on medium/small
                { text: 'Email', dataIndex: 'email', flex: 2, hidden: true, responsiveConfig: { 'width >= 992': { hidden: false } } }
            ],
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                items: [
                    { text: 'Add Client', iconCls: 'x-fa fa-plus', handler: this.onAddClientClick, scope: this },
                    { text: 'Edit Client', iconCls: 'x-fa fa-pencil', handler: this.onEditClientClick, scope: this, bind: { disabled: '{!clientGrid.selection}'} }, // Use grid reference alias
                    { text: 'Delete Client', iconCls: 'x-fa fa-trash', handler: this.onDeleteClientClick, scope: this, bind: { disabled: '{!clientGrid.selection}'} }
                ]
            }],
             reference: 'clientGrid', // Add reference for binding
             selModel: 'rowmodel', // Allow single row selection
             listeners: {
                 itemdblclick: this.onEditClientClick, // Edit on double click
                 scope: this
             }
        };
    },

    createTreatmentsGrid: function() {
        return {
            title: 'Treatments',
            xtype: 'gridpanel',
            store: 'treatments',
             plugins: ['responsive', { ptype: 'gridfilters' }], // Add filtering
             features: [{ftype:'grouping', groupHeaderTpl: 'Client: {name} ({rows.length})'}], // Grouping
            columns: [
                { text: 'Date', dataIndex: 'datum', xtype: 'datecolumn', format: 'Y-m-d', width: 120, filter: { type: 'date'} },
                { text: 'Client', dataIndex: 'client_naam', flex: 2, filter: { type: 'string'} }, // Use mapped name
                { text: 'Treatment', dataIndex: 'behandeling_type_naam', flex: 3, filter: { type: 'list', store: 'treatmentTypes', idField: 'id', labelField: 'naam'} }, // Use mapped name, list filter
                { text: 'Hours', dataIndex: 'aantal_uren', width: 80, align: 'right', renderer: function(value, metaData, record) {
                    return record.get('prijs_type') === 'per_uur' ? Ext.util.Format.number(value, '0.00') : '-';
                 }, filter: { type: 'numeric'} },
                 { text: 'Price Type', dataIndex: 'prijs_type', width: 100, filter: { type: 'list', options: ['per_uur', 'per_sessie']}},
                 { text: 'Price', dataIndex: 'prijs', xtype: 'numbercolumn', format: '€0.00', width: 90, align: 'right', filter: { type: 'numeric'}},
                 { text: 'Amount', xtype: 'numbercolumn', format: '€0.00', width: 100, align: 'right', filter: { type: 'numeric'}, renderer: function(value, metaData, record) {
                        var price = record.get('prijs') || 0;
                        var hours = record.get('aantal_uren') || 0;
                        return Ext.util.Format.currency(record.get('prijs_type') === 'per_uur' ? (price * hours) : price, '€', 2);
                    }
                },
                { text: 'Invoiced', dataIndex: 'gefactureerd', xtype: 'booleancolumn', trueText: 'Yes', falseText: 'No', width: 90, filter: { type: 'boolean'} },
                { text: 'Invoice ID', dataIndex: 'factuur_id', width: 100, filter: { type: 'numeric'} }
            ],
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        { text: 'Add Treatment', iconCls: 'x-fa fa-plus', handler: this.onAddTreatmentClick, scope: this },
                        { text: 'Edit Treatment', iconCls: 'x-fa fa-pencil', handler: this.onEditTreatmentClick, scope: this, bind: { disabled: '{!treatmentGrid.selection || treatmentGrid.selection.gefactureerd}'} }, // Disable if invoiced
                        { text: 'Delete Treatment', iconCls: 'x-fa fa-trash', handler: this.onDeleteTreatmentClick, scope: this, bind: { disabled: '{!treatmentGrid.selection || treatmentGrid.selection.gefactureerd}'} } // Disable if invoiced
                    ]
                },
                {
                    xtype: 'pagingtoolbar', // Paging
                    store: 'treatments',
                    dock: 'bottom',
                    displayInfo: true
                }
            ],
             reference: 'treatmentGrid',
             selModel: 'rowmodel',
             listeners: {
                 itemdblclick: function(grid, record) {
                     if (!record.get('gefactureerd')) { // Only edit if not invoiced
                        this.onEditTreatmentClick(grid);
                     }
                 },
                 scope: this
             }
        };
    },

     createInvoicesGrid: function() {
        return {
            title: 'Invoices',
            xtype: 'gridpanel',
            store: 'invoices',
             plugins: ['responsive', { ptype: 'gridfilters' }],
            columns: [
                { text: 'Invoice #', dataIndex: 'factuur_nummer', width: 150, filter: { type: 'string'} },
                { text: 'Date', dataIndex: 'datum', xtype: 'datecolumn', format: 'Y-m-d', width: 120, filter: { type: 'date'} },
                { text: 'Client', dataIndex: 'client_naam', flex: 2, filter: { type: 'string'} }, // Use mapped name
                { text: 'Period Start', dataIndex: 'start_datum', xtype: 'datecolumn', format: 'Y-m-d', width: 120, hidden: true, responsiveConfig: { 'width >= 768': { hidden: false } }, filter: { type: 'date'} },
                { text: 'Period End', dataIndex: 'eind_datum', xtype: 'datecolumn', format: 'Y-m-d', width: 120, hidden: true, responsiveConfig: { 'width >= 768': { hidden: false } }, filter: { type: 'date'} },
                { text: 'Total Amount', dataIndex: 'totaal_bedrag', xtype: 'numbercolumn', format: '€0.00', width: 130, align: 'right', filter: { type: 'numeric'} },
                { text: 'Paid', dataIndex: 'betaald', xtype: 'booleancolumn', trueText: 'Yes', falseText: 'No', width: 80, filter: { type: 'boolean'} }
            ],
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        { text: 'Generate Invoices', iconCls: 'x-fa fa-cogs', handler: this.onGenerateInvoicesClick, scope: this },
                        { text: 'View PDF', iconCls: 'x-fa fa-file-pdf-o', handler: this.onViewInvoicePdfClick, scope: this, bind: { disabled: '{!invoiceGrid.selection}'} },
                        { text: 'Mark as Paid', iconCls: 'x-fa fa-check-square-o', handler: this.onMarkPaidClick, scope: this, bind: { disabled: '{!invoiceGrid.selection || invoiceGrid.selection.betaald}'} }, // Disable if already paid
                        '->', // Right align following items
                        { text: 'Export Summary', iconCls: 'x-fa fa-file-excel-o', handler: this.onExportClick, scope: this }
                    ]
                },
                 {
                    xtype: 'pagingtoolbar', // Paging
                    store: 'invoices',
                    dock: 'bottom',
                    displayInfo: true
                }
            ],
            reference: 'invoiceGrid',
             selModel: 'rowmodel',
             listeners: {
                 itemdblclick: this.onViewInvoicePdfClick, // View PDF on double click
                 scope: this
             }
        };
    },

     createTreatmentTypesGrid: function() { // Grid for managing Treatment Types
        return {
            title: 'Treatment Types',
            xtype: 'gridpanel',
            store: 'treatmentTypes',
            plugins: ['responsive'],
            columns: [
                { text: 'Name', dataIndex: 'naam', flex: 2 },
                { text: 'Description', dataIndex: 'beschrijving', flex: 3, hidden: true, responsiveConfig: { 'width >= 768': { hidden: false } } },
                { text: 'Price', dataIndex: 'prijs', xtype: 'numbercolumn', format: '€0.00', width: 100, align: 'right' },
                { text: 'Price Type', dataIndex: 'prijs_type', width: 120 } // e.g., 'per_uur', 'per_sessie'
            ],
            dockedItems: [{
                xtype: 'toolbar',
                dock: 'top',
                items: [
                    { text: 'Add Type', iconCls: 'x-fa fa-plus', handler: this.onAddTreatmentTypeClick, scope: this },
                    { text: 'Edit Type', iconCls: 'x-fa fa-pencil', handler: this.onEditTreatmentTypeClick, scope: this, bind: { disabled: '{!treatmentTypeGrid.selection}'} },
                    { text: 'Delete Type', iconCls: 'x-fa fa-trash', handler: this.onDeleteTreatmentTypeClick, scope: this, bind: { disabled: '{!treatmentTypeGrid.selection}'} }
                ]
            }],
             reference: 'treatmentTypeGrid',
             selModel: 'rowmodel',
             listeners: {
                 itemdblclick: this.onEditTreatmentTypeClick,
                 scope: this
             }
        };
    },


    // --- Window and Form Creation ---

    createClientWindow: function(record) {
        var isEdit = record && record.isModel; // Check if editing existing record
        return Ext.create('Ext.window.Window', {
            title: isEdit ? 'Edit Client' : 'Add Client',
            modal: true, // Blocks interaction with background
            width: 500,
            minWidth: 300, // Ensure minimum width on small screens
            layout: 'fit',
            plugins: 'responsive', // Make window itself responsive
             responsiveFormulas: { // Adjust width based on viewport
                small: 'width < 550',
                medium: 'width >= 550 && width < 768',
                large: 'width >= 768'
            },
            responsiveConfig: {
                small: { width: '95%' }, // Use percentage for small screens
                medium: { width: 500 },
                large: { width: 600 }
            },
            items: [{
                xtype: 'form',
                reference: 'clientForm',
                bodyPadding: 15,
                defaults: {
                    anchor: '100%', // Fields take full width
                    allowBlank: false,
                    labelAlign: 'top' // Better for mobile
                },
                items: [
                    { xtype: 'hiddenfield', name: 'id', value: isEdit ? record.getId() : null },
                    { xtype: 'textfield', name: 'naam', fieldLabel: 'Name', value: isEdit ? record.get('naam') : '' },
                    { xtype: 'textfield', name: 'adres', fieldLabel: 'Address', value: isEdit ? record.get('adres') : '' },
                    { xtype: 'textfield', name: 'postcode', fieldLabel: 'Postcode', value: isEdit ? record.get('postcode') : '' },
                    { xtype: 'textfield', name: 'plaats', fieldLabel: 'City', value: isEdit ? record.get('plaats') : '' },
                    { xtype: 'textfield', name: 'telefoon', fieldLabel: 'Phone', allowBlank: true, value: isEdit ? record.get('telefoon') : '' }, // Optional field
                    { xtype: 'textfield', name: 'email', fieldLabel: 'Email', vtype: 'email', allowBlank: true, value: isEdit ? record.get('email') : '' } // Optional field
                ],
                buttons: [
                    { text: 'Save', formBind: true, handler: this.onSaveClient, scope: this, ui: 'action' }, // 'action' ui for emphasis
                    { text: 'Cancel', handler: function(btn) { btn.up('window').close(); } }
                ]
            }]
        }).show();
    },

     createTreatmentWindow: function(record) {
        var isEdit = record && record.isModel;
        return Ext.create('Ext.window.Window', {
            title: isEdit ? 'Edit Treatment' : 'Add Treatment',
            modal: true,
            width: 550,
            minWidth: 320,
            layout: 'fit',
            plugins: 'responsive',
            responsiveFormulas: {
                small: 'width < 600',
                large: 'width >= 600'
            },
             responsiveConfig: {
                small: { width: '95%' },
                large: { width: 550 }
            },
            items: [{
                xtype: 'form',
                reference: 'treatmentForm',
                bodyPadding: 15,
                defaults: { anchor: '100%', labelAlign: 'top' },
                items: [
                    { xtype: 'hiddenfield', name: 'id', value: isEdit ? record.getId() : null },
                    {
                        xtype: 'combobox',
                        name: 'client_id',
                        fieldLabel: 'Client',
                        store: 'clients',
                        displayField: 'naam',
                        valueField: 'id',
                        allowBlank: false,
                        forceSelection: true, // Must select from list
                        queryMode: 'local', // Assuming clients are loaded
                        value: isEdit ? record.get('client_id') : null
                    },
                    {
                        xtype: 'combobox',
                        name: 'behandeling_type_id',
                        fieldLabel: 'Treatment Type',
                        store: 'treatmentTypes',
                        displayField: 'naam',
                        valueField: 'id',
                        allowBlank: false,
                         forceSelection: true,
                         queryMode: 'local',
                         value: isEdit ? record.get('behandeling_type_id') : null,
                         listeners: {
                             select: 'onTreatmentTypeSelect' // Reference controller method
                         }
                    },
                    {
                        xtype: 'datefield',
                        name: 'datum',
                        fieldLabel: 'Date',
                        format: 'Y-m-d', // Match backend format
                        allowBlank: false,
                        value: isEdit ? record.get('datum') : new Date() // Default to today
                    },
                    {
                        xtype: 'numberfield',
                        name: 'aantal_uren',
                        fieldLabel: 'Hours',
                        allowBlank: true, // Can be blank if type is per_session
                        minValue: 0.1,
                        step: 0.25,
                        value: isEdit ? record.get('aantal_uren') : null,
                        reference: 'hoursField', // Reference to enable/disable
                        disabled: isEdit ? (record.get('prijs_type') !== 'per_uur') : true // Disable initially or if editing non-hourly
                    }
                ],
                buttons: [
                    { text: 'Save', formBind: true, handler: this.onSaveTreatment, scope: this, ui: 'action' },
                    { text: 'Cancel', handler: function(btn) { btn.up('window').close(); } }
                ]
            }]
        }).show();
    },

    createTreatmentTypeWindow: function(record) {
        var isEdit = record && record.isModel;
        return Ext.create('Ext.window.Window', {
            title: isEdit ? 'Edit Treatment Type' : 'Add Treatment Type',
            modal: true,
            width: 500,
            minWidth: 300,
            layout: 'fit',
             plugins: 'responsive',
             responsiveConfig: {
                 'width < 550': { width: '95%' },
                 'width >= 550': { width: 500 }
             },
            items: [{
                xtype: 'form',
                reference: 'treatmentTypeForm',
                bodyPadding: 15,
                defaults: { anchor: '100%', labelAlign: 'top' },
                items: [
                    { xtype: 'hiddenfield', name: 'id', value: isEdit ? record.getId() : null },
                    { xtype: 'textfield', name: 'naam', fieldLabel: 'Name', allowBlank: false, value: isEdit ? record.get('naam') : '' },
                    { xtype: 'textareafield', name: 'beschrijving', fieldLabel: 'Description', allowBlank: true, value: isEdit ? record.get('beschrijving') : '' },
                    { xtype: 'numberfield', name: 'prijs', fieldLabel: 'Price (€)', allowBlank: false, minValue: 0, value: isEdit ? record.get('prijs') : 0 },
                    {
                        xtype: 'combobox',
                        name: 'prijs_type',
                        fieldLabel: 'Price Type',
                        store: ['per_uur', 'per_sessie'], // Simple store for options
                        allowBlank: false,
                        forceSelection: true,
                        value: isEdit ? record.get('prijs_type') : 'per_sessie' // Default
                    }
                ],
                buttons: [
                    { text: 'Save', formBind: true, handler: this.onSaveTreatmentType, scope: this, ui: 'action' },
                    { text: 'Cancel', handler: function(btn) { btn.up('window').close(); } }
                ]
            }]
        }).show();
    },

     createGenerateInvoiceWindow: function() {
        return Ext.create('Ext.window.Window', {
            title: 'Generate Invoices',
            modal: true,
            width: 400,
            layout: 'fit',
             plugins: 'responsive',
             responsiveConfig: {
                 'width < 450': { width: '95%' },
                 'width >= 450': { width: 400 }
             },
            items: [{
                xtype: 'form',
                reference: 'generateInvoiceForm',
                bodyPadding: 15,
                defaults: { anchor: '100%', labelAlign: 'top', allowBlank: false },
                items: [
                    {
                        xtype: 'datefield',
                        name: 'start_datum',
                        fieldLabel: 'Start Date (Inclusive)',
                        format: 'Y-m-d',
                        value: Ext.Date.getFirstDateOfMonth(new Date()) // Default to start of current month
                    },
                    {
                        xtype: 'datefield',
                        name: 'eind_datum',
                        fieldLabel: 'End Date (Inclusive)',
                        format: 'Y-m-d',
                        value: Ext.Date.getLastDateOfMonth(new Date()) // Default to end of current month
                    }
                ],
                buttons: [
                    { text: 'Generate', formBind: true, handler: this.onConfirmGenerateInvoices, scope: this, ui: 'action' },
                    { text: 'Cancel', handler: function(btn) { btn.up('window').close(); } }
                ]
            }]
        }).show();
    },

    // --- Event Handlers ---

    onAddClientClick: function() {
        this.createClientWindow(); // No record passed for add
    },

    onEditClientClick: function(grid) {
         // Handle grid direct call or button click
        var clientGrid = grid.isXType('gridpanel') ? grid : this.lookupReference('clientGrid');
        var selection = clientGrid.getSelectionModel().getSelection();
        if (selection.length > 0) {
            this.createClientWindow(selection[0]);
        } else {
            Ext.Msg.alert('Selection Error', 'Please select a client to edit.');
        }
    },

    onDeleteClientClick: function() {
        var clientGrid = this.lookupReference('clientGrid');
        var selection = clientGrid.getSelectionModel().getSelection();
        if (selection.length > 0) {
            var client = selection[0];
            Ext.Msg.confirm('Confirm Delete', 'Are you sure you want to delete client "' + client.get('naam') + '"?', function(btn) {
                if (btn === 'yes') {
                    client.erase({ // Uses the model's proxy
                        success: function() {
                            Ext.getStore('clients').remove(client); // Also remove from store UI
                            Ext.Msg.alert('Success', 'Client deleted.');
                        },
                        failure: function(record, operation) {
                            // Error already shown by proxy listener
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
        var form = win.down('form').getForm();

        if (form.isValid()) {
            var values = form.getValues();
            var store = Ext.getStore('clients');
            var record;

            if (values.id) { // Editing existing
                record = store.getById(parseInt(values.id));
                 if (record) {
                     record.set(values); // Update record with form values
                 } else {
                     Ext.Msg.alert('Error', 'Record not found for update.');
                     win.close();
                     return;
                 }
            } else { // Adding new
                 // Remove null ID before creating
                 delete values.id;
                record = Ext.create('BillingApp.model.Client', values);
                 store.add(record); // Add tentatively
            }

             win.setLoading('Saving...');
            record.save({
                success: function(record, operation) {
                     win.setLoading(false);
                     // If new, backend might return the full record with ID
                     if (operation.action === 'create') {
                         // No need to manually update store if proxy returns the record
                         // store.commitChanges(); // Or reload store if proxy doesnt return record
                     } else {
                         store.commitChanges(); // Commit update changes
                     }
                    win.close();
                    Ext.Msg.alert('Success', 'Client saved.');
                    store.load(); // Reload store to ensure consistency
                },
                failure: function(record, operation) {
                     win.setLoading(false);
                     // Error already shown by proxy listener
                     // Rollback changes if save failed
                     store.rejectChanges();
                     if(operation.action === 'create') {
                         store.remove(record); // Remove the tentatively added record
                     }
                     console.error('Failed to save client', operation);
                }
            });
        }
    },

    onAddTreatmentClick: function() {
        this.createTreatmentWindow();
    },

     onEditTreatmentClick: function(grid) {
         var treatmentGrid = grid.isXType('gridpanel') ? grid : this.lookupReference('treatmentGrid');
        var selection = treatmentGrid.getSelectionModel().getSelection();
        if (selection.length > 0) {
            if(selection[0].get('gefactureerd')) {
                Ext.Msg.alert('Edit Error', 'Cannot edit an invoiced treatment.');
                return;
            }
            this.createTreatmentWindow(selection[0]);
        } else {
             Ext.Msg.alert('Selection Error', 'Please select a treatment to edit.');
        }
    },

    onDeleteTreatmentClick: function() {
         var treatmentGrid = this.lookupReference('treatmentGrid');
        var selection = treatmentGrid.getSelectionModel().getSelection();
        if (selection.length > 0) {
            var treatment = selection[0];
             if(treatment.get('gefactureerd')) {
                Ext.Msg.alert('Delete Error', 'Cannot delete an invoiced treatment.');
                return;
            }
            Ext.Msg.confirm('Confirm Delete', 'Are you sure you want to delete this treatment record?', function(btn) {
                if (btn === 'yes') {
                    treatment.erase({
                        success: function() {
                             Ext.getStore('treatments').remove(treatment);
                            Ext.Msg.alert('Success', 'Treatment deleted.');
                        },
                        failure: function(record, operation) { /* Error handled by proxy */ }
                    });
                }
            }, this);
        } else {
             Ext.Msg.alert('Selection Error', 'Please select a treatment to delete.');
        }
    },

     onSaveTreatment: function(button) {
        var win = button.up('window');
        var form = win.down('form').getForm();

        if (form.isValid()) {
            var values = form.getValues();
            var store = Ext.getStore('treatments');
            var record;

            // Ensure date is formatted correctly for backend
            values.datum = Ext.Date.format(form.findField('datum').getValue(), 'Y-m-d');

            // Handle blank hours if price type is not 'per_uur'
            var typeStore = Ext.getStore('treatmentTypes');
            var typeRecord = typeStore.getById(parseInt(values.behandeling_type_id));
            if (typeRecord && typeRecord.get('prijs_type') !== 'per_uur') {
                values.aantal_uren = null; // Set hours to null if not hourly
            } else if (!values.aantal_uren || values.aantal_uren <= 0) {
                 // If hourly, ensure hours are provided (or handle based on requirements)
                 // form.findField('aantal_uren').markInvalid('Hours required for this treatment type.');
                 // return; // Uncomment if hours are strictly required for hourly types
                  values.aantal_uren = null; // Allow null/0 if backend handles it
            }


            if (values.id) { // Editing
                record = store.getById(parseInt(values.id));
                 if (record) {
                     record.set(values);
                 } else {
                      Ext.Msg.alert('Error', 'Record not found for update.'); win.close(); return;
                 }
            } else { // Adding
                 delete values.id;
                record = Ext.create('BillingApp.model.Treatment', values);
                 store.add(record);
            }

             win.setLoading('Saving...');
            record.save({
                success: function(rec, op) {
                     win.setLoading(false);
                     if (op.action === 'create') { /* store handled by proxy return */ }
                     else { store.commitChanges(); }
                    win.close();
                    Ext.Msg.alert('Success', 'Treatment saved.');
                     store.load(); // Reload to get updated calculated fields/joins
                },
                failure: function(rec, op) {
                    win.setLoading(false);
                    store.rejectChanges();
                    if(op.action === 'create') store.remove(rec);
                    console.error('Failed to save treatment', op);
                }
            });
        }
    },

     // Handler in form controller or main app controller
     onTreatmentTypeSelect: function(combo, record) {
         var form = combo.up('form'); // Get the form
         var hoursField = form.lookupReference('hoursField'); // Find the hours field by reference

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
     },

     // --- Treatment Type Handlers ---
      onAddTreatmentTypeClick: function() {
         this.createTreatmentTypeWindow();
     },
     onEditTreatmentTypeClick: function(grid) {
          var typeGrid = grid.isXType('gridpanel') ? grid : this.lookupReference('treatmentTypeGrid');
         var selection = typeGrid.getSelectionModel().getSelection();
         if (selection.length > 0) {
             this.createTreatmentTypeWindow(selection[0]);
         } else {
             Ext.Msg.alert('Selection Error', 'Please select a treatment type to edit.');
         }
     },
     onDeleteTreatmentTypeClick: function() {
         var typeGrid = this.lookupReference('treatmentTypeGrid');
         var selection = typeGrid.getSelectionModel().getSelection();
         if (selection.length > 0) {
             var type = selection[0];
             Ext.Msg.confirm('Confirm Delete', 'Are you sure you want to delete treatment type "' + type.get('naam') + '"? This might affect existing treatments.', function(btn) {
                 if (btn === 'yes') {
                     type.erase({
                         success: function() {
                             Ext.getStore('treatmentTypes').remove(type);
                             Ext.Msg.alert('Success', 'Treatment type deleted.');
                         },
                         failure: function(record, operation) { /* Error handled by proxy */ }
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
             if (values.id) { // Editing
                 record = store.getById(parseInt(values.id));
                 if(record) record.set(values);
                 else { Ext.Msg.alert('Error', 'Record not found for update.'); win.close(); return; }
             } else { // Adding
                 delete values.id;
                 record = Ext.create('BillingApp.model.TreatmentType', values);
                 store.add(record);
             }
              win.setLoading('Saving...');
             record.save({
                 success: function(rec, op) {
                     win.setLoading(false);
                     if (op.action === 'create') { /* store handled by proxy */ }
                     else { store.commitChanges(); }
                     win.close();
                     Ext.Msg.alert('Success', 'Treatment type saved.');
                     store.load();
                 },
                 failure: function(rec, op) {
                     win.setLoading(false);
                     store.rejectChanges();
                     if(op.action === 'create') store.remove(rec);
                     console.error('Failed to save treatment type', op);
                 }
             });
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
            // Format dates correctly
            var startDate = Ext.Date.format(form.findField('start_datum').getValue(), 'Y-m-d');
            var endDate = Ext.Date.format(form.findField('eind_datum').getValue(), 'Y-m-d');

            win.setLoading('Generating Invoices...');
            Ext.Ajax.request({
                url: '/api/facturen/generate',
                method: 'POST',
                jsonData: {
                    start_datum: startDate,
                    eind_datum: endDate
                },
                success: function(response) {
                    win.setLoading(false);
                    var result = Ext.decode(response.responseText);
                    if (result.success) {
                        win.close();
                        Ext.Msg.alert('Success', result.aantal_facturen + ' invoice(s) generated successfully.');
                        Ext.getStore('invoices').load(); // Refresh invoice grid
                        Ext.getStore('treatments').load(); // Refresh treatments grid (invoiced status)
                    } else {
                        Ext.Msg.alert('Generation Failed', result.error || 'An unknown error occurred.');
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

     onViewInvoicePdfClick: function(grid) {
        var invoiceGrid = grid.isXType('gridpanel') ? grid : this.lookupReference('invoiceGrid');
        var selection = invoiceGrid.getSelectionModel().getSelection();
        if (selection.length > 0) {
            var invoiceId = selection[0].getId();
            var pdfUrl = '/api/facturen/' + invoiceId + '/pdf';
            // Open PDF in a new tab/window
            window.open(pdfUrl, '_blank');
        } else {
            Ext.Msg.alert('Selection Error', 'Please select an invoice to view.');
        }
    },

    onMarkPaidClick: function() {
        var invoiceGrid = this.lookupReference('invoiceGrid');
        var selection = invoiceGrid.getSelectionModel().getSelection();
        if (selection.length > 0) {
             var invoice = selection[0];
             if (invoice.get('betaald')) {
                 Ext.Msg.alert('Info', 'This invoice is already marked as paid.');
                 return;
             }

            Ext.Msg.confirm('Confirm Payment', 'Mark invoice ' + invoice.get('factuur_nummer') + ' as paid?', function(btn) {
                if (btn === 'yes') {
                     invoiceGrid.setLoading('Updating status...');
                    Ext.Ajax.request({
                        url: '/api/facturen/' + invoice.getId() + '/betaald',
                        method: 'PUT',
                        success: function(response) {
                            invoiceGrid.setLoading(false);
                            var result = Ext.decode(response.responseText);
                            // Assuming success means the record in response is updated
                             invoice.set('betaald', true); // Update client-side record
                             invoice.commit(); // Commit the change in the store
                            Ext.Msg.alert('Success', 'Invoice marked as paid.');
                        },
                        failure: function(response) {
                             invoiceGrid.setLoading(false);
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
        // Use a simple window to ask for the date range, similar to generate invoices
        Ext.create('Ext.window.Window', {
            title: 'Export Summary to Excel',
            modal: true,
            width: 400,
            layout: 'fit',
             plugins: 'responsive',
             responsiveConfig: {
                 'width < 450': { width: '95%' },
                 'width >= 450': { width: 400 }
             },
            items: [{
                xtype: 'form',
                reference: 'exportForm',
                bodyPadding: 15,
                defaults: { anchor: '100%', labelAlign: 'top', allowBlank: false },
                items: [
                    {
                        xtype: 'datefield',
                        name: 'start_datum',
                        fieldLabel: 'Start Date (Inclusive)',
                        format: 'Y-m-d',
                        value: Ext.Date.getFirstDateOfMonth(new Date())
                    },
                    {
                        xtype: 'datefield',
                        name: 'eind_datum',
                        fieldLabel: 'End Date (Inclusive)',
                        format: 'Y-m-d',
                        value: Ext.Date.getLastDateOfMonth(new Date())
                    }
                ],
                buttons: [
                    {
                        text: 'Export',
                        formBind: true,
                        handler: function(btn) {
                            var win = btn.up('window');
                            var form = win.down('form').getForm();
                            if (form.isValid()) {
                                var values = form.getValues();
                                var startDate = Ext.Date.format(form.findField('start_datum').getValue(), 'Y-m-d');
                                var endDate = Ext.Date.format(form.findField('eind_datum').getValue(), 'Y-m-d');

                                // Create a temporary form to submit the request, triggering browser download
                                var downloadForm = Ext.create('Ext.form.Panel', {
                                    standardSubmit: true, // Use standard form submission
                                    url: '/api/export/excel',
                                    method: 'POST',
                                    renderTo: Ext.getBody(), // Needs to be rendered to work
                                    hidden: true // Keep it invisible
                                });

                                // Add hidden fields for parameters
                                downloadForm.add({ xtype: 'hiddenfield', name: 'start_datum', value: startDate });
                                downloadForm.add({ xtype: 'hiddenfield', name: 'eind_datum', value: endDate });

                                // Submit the form - this won't use AJAX, it's a standard POST
                                downloadForm.getForm().submit();

                                // Clean up the temporary form after a short delay
                                Ext.defer(function() {
                                    downloadForm.destroy();
                                }, 100);

                                win.close();
                            }
                        },
                        scope: this, // Scope needed if accessing app methods
                        ui: 'action'
                    },
                    { text: 'Cancel', handler: function(btn) { btn.up('window').close(); } }
                ]
            }]
        }).show();
    }

});

// Define a basic Application class (required by extend: 'Ext.app.Application')
Ext.define('BillingApp.Application', {
    extend: 'Ext.app.Application',
    name: 'BillingApp'
    // Add controllers, global settings etc. here if needed
});
