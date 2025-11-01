import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160, unique: true })
  email: string;

  // ❌ string | null  ==>  ✅ cukup optional + nullable
  @Column({ type: 'varchar', length: 80, nullable: true, unique: true })
  username?: string;

  @Column({ type: 'varchar', name: 'password_hash', length: 120 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
