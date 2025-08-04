'use client'

import Link from 'next/link'
import { Team, TeamMember } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Users, Crown } from 'lucide-react'

interface TeamCardProps {
  team: Team
  members?: TeamMember[]
}

export function TeamCard({ team, members = [] }: TeamCardProps) {
  return (
    <Card className="group bg-white/5 rounded-lg p-4 md:p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
      <Link href={`/teams/${team.slug}`} className="block">
        <div className="relative mb-4">
          {team.logo_url ? (
            <img
              src={team.logo_url}
              alt={team.name}
              className="w-full h-48 md:h-56 object-cover object-top rounded-lg"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-48 md:h-56 bg-white/10 rounded-lg flex items-center justify-center">
              <Users className="w-12 h-12 text-white/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300 rounded-lg"></div>
        </div>
        <h3 className="text-lg md:text-xl font-bold mb-2 text-white group-hover:text-white/80 transition-colors">
          {team.name}
        </h3>
        {team.name_en && (
          <p className="text-sm md:text-base text-white/60 mb-2">
            {team.name_en}
          </p>
        )}
        {team.description && (
          <p className="text-sm text-white/80 line-clamp-2 mb-2">
            {team.description}
          </p>
        )}
        {/* 멤버 일부 표시 */}
        {members.length > 0 && (
          <div className="flex items-center gap-2 mt-2">
            {members.slice(0, 3).map((member) => (
              <div key={member.id} className="h-8 w-8 border-2 border-white/20 rounded-lg overflow-hidden">
                {member.user?.profile_image ? (
                  <img
                    src={member.user.profile_image}
                    alt={member.user.name}
                    className="w-full h-full object-cover object-top"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-white text-xs">
                      {member.user?.name?.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {members.length > 3 && (
              <span className="text-xs text-white/60 ml-1">+{members.length - 3}</span>
            )}
            {/* 리더 표시 */}
            {members.find(m => m.role === 'leader') && (
              <span className="ml-2 text-xs text-yellow-300 flex items-center gap-1">
                <Crown className="w-3 h-3" />리더
              </span>
            )}
          </div>
        )}
      </Link>
    </Card>
  )
} 