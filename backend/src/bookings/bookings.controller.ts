import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Vid } from '../auth/vid.decorator';
import { VidGuard } from '../auth/vid.guard';
import { Booking } from './booking.entity';
import { BookingsService } from './bookings.service';
import { ListBookingsQuery } from './dto/list-bookings.query';
import { SaveBookingDto } from './dto/save-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  list(@Query() { date }: ListBookingsQuery): Promise<Booking[]> {
    return date
      ? this.bookingsService.findByDate(date)
      : this.bookingsService.findUpcoming();
  }

  // Meant for Aurora: who should be connected on this position right now?
  @Get('current/:callsign')
  async current(
    @Param('callsign') callsign: string,
  ): Promise<{ callsign: string; vid: number }> {
    const vid = await this.bookingsService.findCurrentVid(callsign);
    return { callsign: callsign.toUpperCase(), vid };
  }

  @Post()
  @UseGuards(VidGuard)
  create(@Vid() vid: number, @Body() dto: SaveBookingDto): Promise<Booking> {
    return this.bookingsService.create(vid, dto);
  }

  @Put(':id')
  @UseGuards(VidGuard)
  update(
    @Vid() vid: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SaveBookingDto,
  ): Promise<Booking> {
    return this.bookingsService.update(vid, id, dto);
  }

  @Delete(':id')
  @UseGuards(VidGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Vid() vid: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.bookingsService.remove(vid, id);
  }
}
