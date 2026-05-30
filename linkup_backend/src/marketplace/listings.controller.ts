import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SafeUser } from '../users/users.service';
import { CreateMarketplaceItemDto } from './dto/create-marketplace-item.dto';
import { UpdateMarketplaceItemDto } from './dto/update-marketplace-item.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Post()
  create(
    @Req() req: { user: SafeUser },
    @Body() dto: CreateMarketplaceItemDto,
  ) {
    return this.marketplaceService.create(req.user.id, dto);
  }

  @Get()
  findAll(
    @Req() req: { user: SafeUser },
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    const parsePrice = (value?: string) => {
      if (value === undefined || value === '') {
        return undefined;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    };

    return this.marketplaceService.findAll(req.user.id, {
      q,
      category,
      minPrice: parsePrice(minPrice),
      maxPrice: parsePrice(maxPrice),
      sort,
      page,
      limit,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.marketplaceService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: { user: SafeUser },
    @Body() dto: UpdateMarketplaceItemDto,
  ) {
    return this.marketplaceService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user: SafeUser }) {
    return this.marketplaceService.remove(id, req.user.id);
  }
}
