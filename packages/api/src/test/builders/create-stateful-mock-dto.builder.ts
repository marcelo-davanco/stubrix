import {
  CreateStatefulMockDto,
  StatefulMockRequestDto,
  StateConfigDto,
  StatefulMockResponseDto,
} from '../../stateful-mocks/dto/create-stateful-mock.dto';

export class CreateStatefulMockDtoBuilder {
  private readonly data: CreateStatefulMockDto = {
    name: 'Test Stateful Mock',
    description: 'Returns rows from DB',
    request: {
      method: 'GET',
      urlPath: '/api/test',
    },
    stateConfig: {
      stateEngine: 'postgres',
      stateQuery: 'SELECT * FROM test',
      stateTemplate:
        '{ "rows": {{json state.rows}}, "count": {{state.rowCount}} }',
    },
    response: { status: 200 },
  };

  static create(): CreateStatefulMockDtoBuilder {
    return new CreateStatefulMockDtoBuilder();
  }

  withName(name: string): this {
    this.data.name = name;
    return this;
  }

  withDescription(description: string): this {
    this.data.description = description;
    return this;
  }

  withRequest(request: StatefulMockRequestDto): this {
    this.data.request = { ...request };
    return this;
  }

  withStateConfig(stateConfig: Partial<StateConfigDto>): this {
    this.data.stateConfig = { ...this.data.stateConfig, ...stateConfig };
    return this;
  }

  withResponse(response: StatefulMockResponseDto): this {
    this.data.response = { ...response };
    return this;
  }

  withoutResponse(): this {
    this.data.response = undefined;
    return this;
  }

  build(): CreateStatefulMockDto {
    return {
      ...this.data,
      request: { ...this.data.request },
      stateConfig: { ...this.data.stateConfig },
      response: this.data.response ? { ...this.data.response } : undefined,
    };
  }
}
