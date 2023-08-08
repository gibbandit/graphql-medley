import SchemaBuilder from '@pothos/core';
import RelayPlugin from '@pothos/plugin-relay';

const builder = new SchemaBuilder({
  plugins: [RelayPlugin],
  relayOptions: {
    clientMutationId: 'omit',
    cursorType: 'String',
  },
});

class Type1 {
  id: string;

  field1: string;
  constructor(n: string) {
    this.id = n;
    this.field1 = `first field: my id is ${n}`;
  }
}

const type1 = builder.node(Type1, {
  id: {
    resolve: (num) => num.id,
  },

  loadMany: (ids) => ids.map((id) => new Type1(id)),

  name: 'Type1',
  fields: (t) => ({
    field1: t.exposeString('field1', {}),
  }),
});

builder.queryType({
  fields: (t) => ({
    type1: t.field({
      type: type1,
      args: {
        id: t.arg({
          type: 'String',
          required: true,
        }),
      },
      resolve: (_, args) => new Type1(args.id),
    }),
  }),
});

export const schema = builder.toSchema();
