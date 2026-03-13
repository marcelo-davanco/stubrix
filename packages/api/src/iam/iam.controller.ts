import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IamService } from './iam.service';

export class GetTokenDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}

export class IntrospectTokenDto {
  @IsString()
  token: string;
}

@ApiTags('iam')
@Controller('api/iam')
export class IamController {
  constructor(private readonly service: IamService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check Keycloak and Zitadel availability' })
  async health() {
    const [keycloak, zitadel] = await Promise.all([
      this.service.keycloakHealth(),
      this.service.zitadelHealth(),
    ]);
    return { keycloak, zitadel };
  }

  @Get('config')
  @ApiOperation({ summary: 'Get IAM configuration (Keycloak realm, issuer, Zitadel URL)' })
  config() {
    return this.service.getConfig();
  }

  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a Keycloak access token (password grant)' })
  getToken(@Body() dto: GetTokenDto) {
    return this.service.getToken(dto.username, dto.password);
  }

  @Post('token/client-credentials')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a Keycloak access token (client credentials grant)' })
  clientCredentials() {
    return this.service.getClientCredentialsToken();
  }

  @Post('token/introspect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Introspect a Keycloak token' })
  introspect(@Body() dto: IntrospectTokenDto) {
    return this.service.introspectToken(dto.token);
  }
}
