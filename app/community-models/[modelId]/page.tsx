import { notFound } from 'next/navigation';
import Link from 'next/link';
import PollList from '@/lib/components/polling/PollList';
import ConstitutionViewer from '@/lib/components/ConstitutionViewer';
import PageTitle from '@/lib/components/PageTitle';
import { createConstitution, setActiveConstitution } from '@/lib/actions';
import { getCommunityModel } from '@/lib/data';
import StatementIcon from '@/lib/components/icons/StatementIcon';
import ParticipantIcon from '@/lib/components/icons/ParticipantIcon';

export default async function CommunityModelPage({ params }: { params: { modelId: string } }) {
	const communityModel = await getCommunityModel(params.modelId);

	if (!communityModel) {
		notFound();
	}

	const activeConstitution = communityModel.activeConstitution || communityModel.constitutions[0];

	return (
		<div className="container mx-auto px-4 py-8">
			<PageTitle title={communityModel.name} />
			<p className="mt-4 text-lg text-gray-600">{communityModel.initialIdea}</p>
			
			<div className="mt-8 space-y-8">
				<section>
					<h2 className="text-2xl font-semibold mb-4">Constitutions</h2>
					<form action={createConstitution.bind(null, communityModel.uid)}>
						<button type="submit" className="bg-teal text-white px-4 py-2 rounded hover:bg-teal-dark">
							Create New Constitution
						</button>
					</form>
					{communityModel.constitutions.length > 0 ? (
						<ul className="space-y-2 mt-4">
							{communityModel.constitutions.map((constitution) => (
								<li key={constitution.uid} className="flex items-center space-x-2">
									<Link 
										href={`/community-models/constitution/${constitution.uid}`} 
										className="text-blue-600 hover:underline"
									>
										Constitution v{constitution.version}
									</Link>
									{constitution.uid === communityModel.activeConstitution?.uid ? (
										<span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
											Active
										</span>
									) : (
										<form action={setActiveConstitution.bind(null, communityModel.uid, constitution.uid)}>
											<button type="submit" className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-2.5 py-0.5 rounded">
												Set Active
											</button>
										</form>
									)}
								</li>
							))}
						</ul>
					) : (
						<p className="text-gray-600 mt-4">There are currently no constitutions for this community model.</p>
					)}
				</section>
				
				<section>
					<div className="flex justify-between items-center mb-4">
						<h2 className="text-2xl font-semibold">Polls</h2>
						<Link
							href={`/polls/create?modelId=${communityModel.uid}`}
							className="bg-teal-600 text-white font-medium py-2 px-4 rounded hover:bg-teal-700 transition-colors"
						>
							Create New Poll
						</Link>
					</div>
					<PollList polls={communityModel.polls} />
				</section>
			</div>
		</div>
	);
}
