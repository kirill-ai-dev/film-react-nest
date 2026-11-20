import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Film } from './film.entity';

@Entity({ name: 'schedules' })
@Check('"hall" >= 0')
@Check('"rows" > 0')
@Check('"seats" > 0')
@Check('"price" >= 0')
export class Schedule {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'timestamptz' })
  daytime: string;

  @Column('integer')
  hall: number;

  @Column('integer')
  rows: number;

  @Column('integer')
  seats: number;

  @Column('double precision')
  price: number;

  @Column('text', { array: true, default: '{}' })
  taken: string[];

  @ManyToOne(() => Film, (film) => film.schedule, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'film_id' })
  film: Film;

  @Column({ type: 'uuid' })
  film_id: string;
}
