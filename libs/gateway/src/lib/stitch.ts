import { MergedTypeConfig, SubschemaConfig } from '@graphql-tools/delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { isInterfaceType } from 'graphql';

const defaultMedleyMergeConfig: MergedTypeConfig = {
  entryPoints: [
    {
      fieldName: 'nodes',
      selectionSet: '{ id }',
      key: ({ id: id }) => id,
      argsFromKeys: (ids) => ({ ids }),
    },
    {
      fieldName: 'nodes',
      selectionSet: '{ _stitchedTypeMarker }',
      key: ({ _stitchedTypeMarker: id }) => id,
      argsFromKeys: (ids) => ({ ids }),
    },
  ],
};

export function stitchMedleySubschemas(
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
        subschema.merge[implementedType.name] = defaultMedleyMergeConfig;
      }
      subschema.batch = true;
    }
  }

  const MedleySubschemaConfig: SubschemaConfig = {
    schema: makeExecutableSchema({
      typeDefs: /* GraphQL */ `
        type Query {
          node(id: ID!): Node
          nodes(ids: [ID!]!): [Node]!
        }
        interface Node {
          _stitchedTypeMarker: ID! # marks this type as a medley stitched type
        }
        ${typeNames
          .map(
            (typeName) => /* GraphQL */ `
          type ${typeName} implements Node {
            _stitchedTypeMarker: ID! # marks this type as a medley stitched type
          }
        `
          )
          .join('\n')}
      `,
      resolvers: {
        Query: {
          node: (_, { id }: { id: string }) => ({ _stitchedTypeMarker: id }),
          nodes: (_, { ids }: { ids: string[] }) => {
            return ids.map((id) => ({ _stitchedTypeMarker: id }));
          },
        },
        Node: {
          __resolveType: ({
            _stitchedTypeMarker,
          }: {
            _stitchedTypeMarker: string;
          }) => {
            return getTypeNameFromId(_stitchedTypeMarker);
          },
        },
      },
    }),
  };
  subschemas.push(MedleySubschemaConfig);
  return subschemas;
}
