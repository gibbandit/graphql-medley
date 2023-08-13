import { SubschemaConfig } from '@graphql-tools/delegate';
import { batchDelegateToSchema } from '@graphql-tools/batch-delegate';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { OperationTypeNode, isInterfaceType } from 'graphql';

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
        subschema.merge[implementedType.name] = {
          entryPoints: [
            {
              selectionSet: '{ id }',
              resolve(originalResult, context, info) {
                return batchDelegateToSchema({
                  schema: subschema,
                  operation: OperationTypeNode.QUERY,
                  fieldName: 'nodes',
                  key: originalResult.id,
                  argsFromKeys: (ids) => ({ ids }),
                  context,
                  info,
                });
              },
            },
            {
              selectionSet: '{ _stitchedTypeMarker }',
              resolve(originalResult, context, info) {
                return batchDelegateToSchema({
                  schema: subschema,
                  operation: OperationTypeNode.QUERY,
                  fieldName: 'nodes',
                  key: originalResult._stitchedTypeMarker,
                  argsFromKeys: (ids) => ({ ids }),
                  context,
                  info,
                });
              },
            },
          ],
        };
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
          _stitchedTypeMarker: ID @deprecated(reason: "medley internal field")
        }
        ${typeNames
          .map(
            (typeName) => /* GraphQL */ `
          type ${typeName} implements Node {
            _stitchedTypeMarker: ID @deprecated(reason: "medley internal field")
          }
        `
          )
          .join('\n')}
      `,
      resolvers: {
        Query: {
          node: (_, { id }: { id: string }) => ({
            __typename: getTypeNameFromId(id),
            _stitchedTypeMarker: id,
          }),
          nodes: (_, { ids }: { ids: string[] }) => {
            return ids.map((id) => ({
              __typename: getTypeNameFromId(id),
              _stitchedTypeMarker: id,
            }));
          },
        },
      },
    }),
  };
  subschemas.push(MedleySubschemaConfig);
  return subschemas;
}
