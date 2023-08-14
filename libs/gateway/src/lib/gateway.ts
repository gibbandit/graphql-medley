import { stitchSchemas } from '@graphql-tools/stitch';
import { buildHTTPExecutor } from '@graphql-tools/executor-http';
import { filterSchema } from '@graphql-tools/utils';
import { GraphQLSchema } from 'graphql';
import { SubschemaConfig } from '@graphql-tools/delegate';

import { stitchMedleySubschemas } from './stitch';
import { GatewayOptions, SubschemaOptions } from './types';

function createSubschema(config: SubschemaOptions): SubschemaConfig {
  const subschemaConfig: SubschemaConfig = {
    schema: config.schema,
    executor: buildHTTPExecutor({
      endpoint: config.endpoint,
      headers: config.headers,
    }),
    batch: true,
  };

  return subschemaConfig;
}

export function createGatewaySchema(options: GatewayOptions): GraphQLSchema {
  const subschemas = options.subschema.map((config) => createSubschema(config));
  const schema = stitchSchemas({
    subschemas: stitchMedleySubschemas(subschemas, options.getTypeNameFromId),
    mergeTypes: true,
  });
  return removeMedleyInternalFields(schema);
}

export function removeMedleyInternalFields(schema: GraphQLSchema) {
  const markerField = '_stitchedTypeMarker';
  return filterSchema({
    schema,
    objectFieldFilter: (_, fieldName) => fieldName !== markerField,
    interfaceFieldFilter: (_, fieldName) => fieldName !== markerField,
  });
}
