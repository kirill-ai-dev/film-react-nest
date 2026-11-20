import {
  Check,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Schedule } from './schedule.entity';

@Entity({ name: 'films' })
@Check('"rating" >= 0 AND "rating" <= 10')
export class Film {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('double precision')
  rating: number;

  @Column()
  director: string;

  @Column('text', { array: true, default: '{}' })
  tags: string[];

  @Column('text')
  about: string;

  @Column('text')
  description: string;

  @Column()
  image: string;

  @Column()
  cover: string;

  @OneToMany(() => Schedule, (schedule) => schedule.film, {
    cascade: true,
  })
  schedule: Schedule[];
}
