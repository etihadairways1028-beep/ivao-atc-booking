import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  Repository,
} from 'typeorm';
import { Booking } from './booking.entity';
import { SaveBookingDto } from './dto/save-booking.dto';

const MAX_DURATION_MS = 12 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    private readonly dataSource: DataSource,
  ) {}

  /** Bookings that haven't ended yet, so ongoing sessions are still listed. */
  findUpcoming(): Promise<Booking[]> {
    return this.bookings.find({
      where: { endsAt: MoreThan(new Date()) },
      order: { callsign: 'ASC', startsAt: 'ASC' },
    });
  }

  /** Every booking overlapping the given UTC day, past days included. */
  findByDate(date: string): Promise<Booking[]> {
    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(dayStart.getTime() + ONE_DAY_MS);

    return this.bookings.find({
      where: { startsAt: LessThan(dayEnd), endsAt: MoreThan(dayStart) },
      order: { callsign: 'ASC', startsAt: 'ASC' },
    });
  }

  /** VID of whoever has booked the position right now, if anyone. */
  async findCurrentVid(callsign: string): Promise<number> {
    const now = new Date();
    const booking = await this.bookings.findOne({
      where: {
        callsign: callsign.toUpperCase(),
        startsAt: LessThanOrEqual(now),
        endsAt: MoreThan(now),
      },
    });

    if (!booking) {
      throw new NotFoundException(`${callsign} is not booked at the moment`);
    }
    return booking.vid;
  }

  create(vid: number, dto: SaveBookingDto): Promise<Booking> {
    this.assertValidPeriod(dto.startsAt, dto.endsAt);

    return this.dataSource.transaction(async (manager) => {
      await this.assertNoConflict(manager, vid, dto);
      return manager.save(manager.create(Booking, { ...dto, vid }));
    });
  }

  update(vid: number, id: number, dto: SaveBookingDto): Promise<Booking> {
    this.assertValidPeriod(dto.startsAt, dto.endsAt);

    return this.dataSource.transaction(async (manager) => {
      const booking = await this.findEditable(manager, vid, id);
      await this.assertNoConflict(manager, vid, dto, id);
      return manager.save(Object.assign(booking, dto));
    });
  }

  async remove(vid: number, id: number): Promise<void> {
    const booking = await this.findEditable(this.bookings.manager, vid, id);
    await this.bookings.remove(booking);
  }

  /** Users can only touch their own bookings, and only before they start. */
  private async findEditable(
    manager: EntityManager,
    vid: number,
    id: number,
  ): Promise<Booking> {
    const booking = await manager.findOneBy(Booking, { id });

    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    if (booking.vid !== vid) {
      throw new ForbiddenException('You can only change your own bookings');
    }
    if (booking.startsAt <= new Date()) {
      throw new ForbiddenException(
        'Past or ongoing bookings cannot be changed',
      );
    }
    return booking;
  }

  private assertValidPeriod(startsAt: Date, endsAt: Date): void {
    if (startsAt <= new Date()) {
      throw new BadRequestException('A booking must start in the future');
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('A booking must end after it starts');
    }
    if (endsAt.getTime() - startsAt.getTime() > MAX_DURATION_MS) {
      throw new BadRequestException('A booking cannot last more than 12 hours');
    }
  }

  /**
   * Rejects the booking if, during the requested period, the position is
   * already booked or the user is already booked on another position.
   * Two periods overlap when each one starts before the other one ends,
   * so back-to-back bookings (10:00-12:00 then 12:00-14:00) are allowed.
   * `excludeId` skips the booking being edited.
   */
  private async assertNoConflict(
    manager: EntityManager,
    vid: number,
    { callsign, startsAt, endsAt }: SaveBookingDto,
    excludeId?: number,
  ): Promise<void> {
    const query = manager
      .createQueryBuilder(Booking, 'b')
      .where('b.startsAt < :endsAt AND b.endsAt > :startsAt', {
        startsAt,
        endsAt,
      })
      .andWhere('(b.callsign = :callsign OR b.vid = :vid)', { callsign, vid });

    if (excludeId !== undefined) {
      query.andWhere('b.id != :excludeId', { excludeId });
    }

    const conflict = await query.getOne();
    if (!conflict) return;

    throw new ConflictException(
      conflict.callsign === callsign
        ? `${callsign} is already booked during this period`
        : `You already have a booking on ${conflict.callsign} during this period`,
    );
  }
}
