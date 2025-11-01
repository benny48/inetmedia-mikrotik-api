import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('pppoe_accounts')
export class PppoeAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Customer, (c) => c.pppoeAccounts, { onDelete: 'CASCADE' })
  customer: Customer;

  @Index({ unique: true })
  @Column({ length: 200 })
  name: string; // PPPoE username (unik di DB)

  @Column({ length: 200, nullable: true })
  profile?: string;

  @Column({ length: 20, default: 'pppoe' })
  service: 'pppoe' | 'any';

  @Column({ default: false })
  disabled: boolean;

  @Column({ length: 200, nullable: true })
  localAddress?: string;

  @Column({ length: 200, nullable: true })
  remoteAddress?: string;

  @Column({ length: 200, nullable: true })
  callerId?: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Index()
  @Column({ length: 64, nullable: true })
  mikrotikId?: string;

  // ===== ISOLIR tracking =====
  @Column({ default: false })
  isIsolated: boolean;

  @Column({ length: 200, nullable: true })
  previousProfile?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
