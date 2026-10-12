export var RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    note: {
      type: 'object',
      properties: {
        orderNumber: { type: 'string' },
        supplierName: { type: 'string' },
        description: { type: 'string' },
        actionsTaken: { type: 'string' },
        followUp: { type: 'string' },
      },
    },
    drafts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          party: { type: 'string' },
          label: { type: 'string' },
          hint: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['party', 'text'],
      },
    },
  },
  required: ['drafts'],
};
