import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PppoeAccount } from './pppoe-account.entity';
import { Payment } from './payment.entity';

const moneyTransformer = {
  to: (v?: number) => v,
  from: (v: any) =>
    v === null || v === undefined
      ? v
      : typeof v === 'number'
        ? v
        : parseFloat(v),
};

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 120 })
  code: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 200, nullable: true })
  email?: string;

  @Column({ length: 32, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  // ======= Biaya langganan =======
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
    transformer: moneyTransformer,
  })
  subscriptionFee: number;

  // ======= Jatuh tempo / penagihan =======
  @Column({ type: 'date', nullable: true })
  @Index()
  dueDate?: string; // YYYY-MM-DD (tanggal jatuh tempo berikutnya)

  @Column({ type: 'int', nullable: true })
  billingDueDay?: number; // 1..28 (opsional, bantu hitung dueDate berikutnya)

  @OneToMany(() => PppoeAccount, (acc) => acc.customer, { cascade: false })
  pppoeAccounts: PppoeAccount[];

  @OneToMany(() => Payment, (p) => p.customer, { cascade: false })
  payments: Payment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
