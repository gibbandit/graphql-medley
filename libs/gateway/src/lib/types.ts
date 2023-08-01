import { GraphQLSchema } from 'graphql';
import { HeadersConfig } from '@graphql-tools/executor-http';
import { ExecutionRequest } from '@graphql-tools/utils';

export type GatewayOptions = {
  subschema: SubschemaOptions[];
  getTypeNameFromId: (id: string) => string;
};

export type SubschemaOptions = {
  url: string;
  schema?: GraphQLSchema;
  headers?: HeadersConfig | ((request?: ExecutionRequest) => HeadersConfig);
};
