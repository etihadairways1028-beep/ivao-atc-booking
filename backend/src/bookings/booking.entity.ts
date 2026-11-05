import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// All dates are stored and exchanged in UTC, like everything else in aviation.
@Entity('bookings')
@Index(['callsign', 'startsAt'])
@Index(['vid', 'startsAt'])
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  vid: number;

  @Column({ length: 16 })
  callsign: string;

  @Column({ type: 'datetime' })
  startsAt: Date;

  @Column({ type: 'datetime' })
  endsAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
