import { MergedTypeConfig, SubschemaConfig } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isInterfaceType } from 'graphql';

//TODO: enable batching on these merges
const defaultRelayMergeConfig: MergedTypeConfig = {
  fieldName: 'node',
  selectionSet: '{ id }',
  args: ({ id }) => ({ id: id }),
  //key: ({ id: id }) => id,
  //argsFromKeys: (ids) => ({ ids }),
};

export function stitchRelaySubschemas(
  subschemas: SubschemaConfig[],
  getTypeNameFromId: (id: string) => string
) {
  const typeNames: string[] = [];

  for (const subschema of subschemas) {
    const nodeType = subschema.schema.getType('Node');
    if (nodeType) {
      if (!isInterfaceType(nodeType)) {
        throw new Error(`🚨 Node type should be an interface!`);
      }
      const implementations = subschema.schema.getPossibleTypes(nodeType);
      for (const implementedType of implementations) {
        typeNames.push(implementedType.name);
        subschema.merge = subschema.merge || {};
        subschema.merge[implementedType.name] = defaultRelayMergeConfig;
      }
      subschema.batch = true;
    }
  }

  const relaySubschemaConfig: SubschemaConfig = {
    schema: makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          node(id: ID!): Node
          nodes(ids: [ID!]!): [Node]!
        }
        interface Node {
          id: ID!
        }
        ${typeNames
          .map(
            (typeName) => `
          type ${typeName} implements Node {
            id: ID!
          }
        `
          )
          .join('\n')}
      `,
      resolvers: {
        Query: {
          node: (_, { id }: { id: string }) => ({ id: id }),
          nodes: (_, { ids }: { ids: string[] }) => {
            return ids.map((id) => ({ id: id }));
          },
        },
        Node: {
          __resolveType: ({ id }: { id: string }) => {
            return getTypeNameFromId(id);
          },
        },
      },
    }),
  };
  subschemas.push(relaySubschemaConfig);
  return subschemas;
}
